input.onButtonPressed(Button.A, function () {
    nextSalat = -1
})
// proocole:
//
// MM,DD,FH:FM,CH:CM,DH:DM,AH:AM,MH:MM,IH:IM$
//
//
// will create st-MMDD.txt with the data sent until $
//
// C is for chourouk
serial.onDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    basic.showIcon(IconNames.TShirt)
    dataline = serial.readUntil(serial.delimiters(Delimiters.Dollar))
    let data = dataline.split(',')
    serial.writeString("DATA:")
    serial.writeLine(dataline)
    if (data.length != 8) {
        serial.writeLine("Bad format: 8 columns required")
        return;
    }
    fname = "st-"
    i = parseInt(data[0])
    if (!(i >= 1 && i <= 12)) {
        serial.writeLine("Bad format: Col 1 (month) must be a number between 1 and 12")
        return;
    }
    fname = "" + fname + toTwoDigitText(i)
    i = parseInt(data[1])
    if (!(i >= 1 && i <= 31)) {
        serial.writeLine("Bad format: Col 2 (day) must be a number between 1 and 31")
        return;
    }
    fname = "" + fname + toTwoDigitText(i) + ".txt"
    data.forEach(function (v: string, idx: number) {
        if (idx < 2) return; //Skip month / day
        if (v.indexOf(':') < 0) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }
        let q = v.split(':');
        i = parseInt(q[0]);
        if (!(i >= 0 && i < 48)) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }

        i = parseInt(q[1]);
        if (!(i >= 0 && i < 60)) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }
    });
    if (fail) {
        return;
    }
    serial.writeLine("Updating " + fname)
    f = files.open(fname)
    f.close()
    f.remove()
    f.open()
    f.writeString(dataline)
    f.close()
    nextSalat = -1
    basic.showIcon(IconNames.Yes)
})
function updateSleepState() {
    nacc = input.acceleration(Dimension.Strength)
    // Reveiller ou prologer le reveil si activiter
    // accelrometre
    if (Math.abs(nacc - acc) > 50) {
        wakeUpTime = input.runningTime()
        OLED12864_I2C.on()
        basic.showIcon(IconNames.Happy)
    }
    acc = nacc
    // Mise en veille si pas de mvmt jusqu a wakeuptime
    if (wakeUpTime >= 0 && input.runningTime() > wakeUpTime + sleepTimeOutMillis) {
        wakeUpTime = -1
        OLED12864_I2C.off()
        basic.showIcon(IconNames.Asleep)
        basic.pause(500)
        basic.showString("")
    }
}
function loadNextSalat(mois: number, jour: number, heureAct: number, minAct: number, checkNextDay: boolean) {
    basic.showIcon(IconNames.SmallDiamond)
    files.readToSerial("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    f = files.open("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    b = f.readBuffer(64).toString()
    f.close()
    b.split(',').find(function (v: string, i: number): boolean {
        if (i < 2) return false; //Skip month / day
        let p = v.split(':');
        debug("V", v);
        nextSalatHour = parseFloat(p[0]);
        nextSalatMin = parseFloat(p[1]);

        debug("P", p[0] + ":" + p[1])
        debug("N", nextSalatHour + ":" + nextSalatMin);
        if (nextSalatHour < heureAct) return false;
        if (nextSalatHour == heureAct && nextSalatMin <= minAct) return false;
        nextSalat = i - 1;
        return true;
    });
    if (nextSalat < 0 && checkNextDay) {
        debug("next day")
        jdm = 30
        if (mois == 2) {
            if (ds.getYear() % 4 == 0) {
                jdm = 29
            } else {
                jdm = 28
            }
        } else if (mois31.indexOf(mois) >= 0) {
            jdm = 31
        }
        if (jour < jdm) {
            jour = jour + 1
        } else {
            jour = 1
            mois = mois + 1
            if (mois > 12) {
                mois = 1
            }
        }
        debug(jour + "/" + mois)
        loadNextSalat(mois, jour, 0, 0, false)
    }
    basic.showIcon(IconNames.Yes)
}
function checkAdhan(h: number, m: number) {
    if (nextSalat < 0) {
        return;
    }
    if (nextSalatMin == m && nextSalatHour % 24 == h) {
        basic.showIcon(IconNames.Butterfly)
        basic.pause(100)
        basic.showString("Heure de salat !")
        nextSalat = -1
    }
}
input.onButtonPressed(Button.B, function () {
    nextSalat = 0
})
let jdm = 0
let nacc = 0
let fname = ""
let sleepTimeOutMillis = 0
let acc = 0
let wakeUpTime = 0
let mois31: number[] = []
let fail = false
let fname2 = ""
let nextSalat = 0
let f: files.File = null
let b = ""
let nextSalatHour = 0
let nextSalatMin = 0
let dataline = ""
let i = 0
let ds: DS1302.DS1302RTC = null
let jour = 0
let mois = 0
function debug(message: string, message2: string = null, message3: string = null) {
    serial.writeLine(message + message2 + message3)
}
mois31 = [1, 3, 5, 7, 8, 10, 12]
serial.redirectToUSB()
serial.setRxBufferSize(50)
nextSalatHour = -1
nextSalatMin = -1
nextSalat = -1
wakeUpTime = input.runningTime()
acc = input.acceleration(Dimension.Strength)
sleepTimeOutMillis = 5000
function toTwoDigitText(num: number) {
    if (num < 10) return "0" + convertToText(num);
    else return convertToText(num);
}
ds = DS1302.create(DigitalPin.P13, DigitalPin.P14, DigitalPin.P15)
ds.start()
OLED12864_I2C.init(60)
OLED12864_I2C.on()
basic.forever(function () {
    checkAdhan(ds.getHour(), ds.getMinute())
    updateSleepState()
    if (nextSalat < 0) {
        loadNextSalat(ds.getMonth(), ds.getDay(), ds.getHour(), ds.getMinute(), true)
    }
    if (wakeUpTime >= 0) {
        OLED12864_I2C.showString(
            0,
            0,
            "" + convertToText(ds.getDay()) + "/" + convertToText(ds.getMonth()) + "/" + convertToText(ds.getYear()),
            1
        )
        OLED12864_I2C.showString(
            0,
            1,
            "" + toTwoDigitText(ds.getHour()) + ":" + toTwoDigitText(ds.getMinute()) + "." + toTwoDigitText(ds.getSecond()),
            1
        )
        OLED12864_I2C.showString(
            0,
            2,
            "" + nextSalat + " " + nextSalatHour + ":" + nextSalatMin,
            1
        )
    }
})
