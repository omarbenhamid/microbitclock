// proocole: MM$ => Dump calendar of given month
// MM,DD$ => Dump calender of given day
// MM,DD,FH:FM,CH:CM,DH:DM,AH:AM,MH:MM,IH:IM$ =>
// Umpdate calender of given day
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
    if (data.length == 1) {
        m = parseInt(data[0])
        serial.writeLine("Dump calender of month " + m)
        let jd = jdm(m)
        for (j = 1; j <= jd; j++) {
            files.readToSerial("st-" + toTwoDigitText(m) + toTwoDigitText(j) + ".txt")
        }
        serial.writeLine("" + "\r\nDone")
        return;
    }
    if (data.length == 2) {
        n = parseInt(data[0])
        j = parseInt(data[1])
        serial.writeLine("Dump calender of day " + j + "/" + n)
        files.readToSerial("st-" + toTwoDigitText(n) + toTwoDigitText(j) + ".txt")
        serial.writeLine("" + "\r\nDone")
        return;
    }
    if (data.length != 8) {
        serial.writeLine("Bad format: 8 columns required")
        return;
    }
    fname = "st-"
    j = parseInt(data[0])
    if (!(j >= 1 && j <= 12)) {
        serial.writeLine("Bad format: Col 1 (month) must be a number between 1 and 12")
        return;
    }
    fname = "" + fname + toTwoDigitText(j)
    j = parseInt(data[1])
    if (!(j >= 1 && j <= 31)) {
        serial.writeLine("Bad format: Col 2 (day) must be a number between 1 and 31")
        return;
    }
    fname = "" + fname + toTwoDigitText(j) + ".txt"
    data.forEach(function (v: string, idx: number) {
        if (idx < 2) return; //Skip month / day
        if (v.indexOf(':') < 0) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }
        let q = v.split(':');
        j = parseInt(q[0]);
        if (!(j >= 0 && j < 48)) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }

        j = parseInt(q[1]);
        if (!(j >= 0 && j < 60)) {
            serial.writeLine("Bad format: " + v + " is not a valid time.");
            fail = true;
        }
    });
    if (fail) {
        return;
    }
    serial.writeLine("Updating " + fname)
    f = files.open(fname)
    serial.writeLine("Openend")
    f.close()
    serial.writeLine("Cloased")
    f.remove()
    serial.writeLine("Removed")
    basic.pause(500)
    f.open()
    serial.writeLine("Opened again")
    f.writeString(dataline)
    serial.writeLine("Wrote")
    f.flush()
    serial.writeLine("Flushed")
    f.close()
    serial.writeLine("Closing")
    nextSalat = -1
    serial.writeLine("" + "\r\nDone")
    basic.showIcon(IconNames.Yes)
})
function loadNextSalat(mois: number, jour: number, heureAct: number, minAct: number, checkNextDay: boolean) {
    basic.showIcon(IconNames.SmallDiamond)
    files.readToSerial("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    serial.writeLine("\r\nComputing next salat time.")
    f = files.open("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    b = f.readBuffer(64).toString()
    f.close()
    b.split(',').find(function (v: string, i: number): boolean {
        if (i < 2) return false; //Skip month / day
        let p = v.split(':');
        nextSalatHour = parseFloat(p[0]);
        nextSalatMin = parseFloat(p[1]);
        if (nextSalatHour < heureAct) return false;
        if (nextSalatHour == heureAct && nextSalatMin <= minAct) return false;
        nextSalat = i - 1;
        debug("Next", nextSalatHour + ":" + nextSalatMin, " index :" + nextSalat);
        return true;
    });
    if (nextSalat < 0 && checkNextDay) {
        debug("next day")
        if (jour < jdm(mois)) {
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
        for (let i = 0; i < 4; i++) {
            music.playTone(262, music.beat(BeatFraction.Breve))
            music.playTone(262, music.beat(BeatFraction.Half))
            music.playTone(262, music.beat(BeatFraction.Breve))
        }
        basic.pause(100)
        basic.showString("Allaho Akbar")
        nextSalat = -1
    }
}
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
// Protocol MM# => Dump calendar for given month
input.onButtonPressed(Button.B, function () {

})
input.onButtonPressed(Button.A, function () {

})
let nacc = 0
let fname = ""
let n = 0
let m = 0
let sleepTimeOutMillis = 0
let acc = 0
let wakeUpTime = 0
let mois = 0
let jour = 0
let ds: DS1302.DS1302RTC = null
let j = 0
let dataline = ""
let nextSalatMin = 0
let nextSalatHour = 0
let b = ""
let f: files.File = null
let nextSalat = 0
let fname2 = ""
let fail = false
let mois31: number[] = []
function jdm(mois: number): number {
    if (mois == 2) {
        if (ds.getYear() % 4 == 0) {
            return 29
        } else {
            return 28
        }
    } else if (mois31.indexOf(mois) >= 0) {
        return 31
    }
    return 30
}
function debug(message: string, message2: string = null, message3: string = null) {
    let m = message;
    if (message2) m = m + message2;
    if (message3) m = m + message3;
    serial.writeLine(m)
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
