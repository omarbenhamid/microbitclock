// proocole: MM$ => Dump calendar of given month
// MM,DD$ => Dump calender of given day
// MM,DD,FH:FM,CH:CM,DH:DM,AH:AM,MH:MM,IH:IM$ =>
// Umpdate calender of given day
//
//
// will create st-MMDD.txt with the data sent until $
//
// C is for chourouk
//
// type #$ to cancel line completely
serial.onDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    basic.showIcon(IconNames.TShirt)
    let dataline: string = serial.readUntil(serial.delimiters(Delimiters.Dollar))
    if (dataline.indexOf('#') >= 0) {
        serial.writeString("\r\n Cancel line")
        return;
    }
    if (dataline.length == 0) {
        serial.writeLine("Dumping salat times file")
        f.seek(0, FileSystemSeekFlags.Set)
        let b: Buffer = null;
        do {
            b = f.readBuffer(64)
            serial.writeBuffer(b)
        } while (b.length > 0)
        serial.writeLine("\r\n done")
        return;
    }

    while (dataline.length > 0 && "\n\r\t ".indexOf(dataline[0]) >= 0)
        dataline = dataline.substr(1)

    if (dataline.length != 41) {
        serial.writeLine("Bad format : line must be 41 characters, " + dataline.length + " found")
        return;
    }

    serial.writeString("\r\nProcessing:")
    serial.writeLine(dataline)

    let data = dataline.split(',')

    if (data.length != 8) {
        serial.writeLine("Bad format: 8 columns required")
        return;
    }
    let mois = parseInt(data[0])
    if (!(mois >= 1 && mois <= 12)) {
        serial.writeLine("Bad format: Col 1 (month) must be a number between 1 and 12")
        return;
    }
    let jour = parseInt(data[1])
    if (!(jour >= 1 && jour <= 31)) {
        serial.writeLine("Bad format: Col 2 (day) must be a number between 1 and 31")
        return;
    }

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
    serial.writeLine("Updating salat times")

    if (!seekLineForDay(mois, jour))
        f.seek(0, FileSystemSeekFlags.End)

    f.writeString(dataline + "\r\n")
    f.flush()
    nextSalat = -1
    serial.writeLine("Done")
    basic.showIcon(IconNames.Yes)
})

function seekLineForDay(mois: number, jour: number, startpos: number = 0): boolean {
    let ret = 0
    f.seek(startpos, FileSystemSeekFlags.Set)

    while (true) {
        b = f.readBuffer(43).toString();
        debug(b)
        if (b.length < 43) return false;
        let data = b.split(',', 3)
        if (parseInt(data[0]) == mois && parseInt(data[1]) == jour) {
            f.seek(ret, FileSystemSeekFlags.Set);
            return true;
        }
        ret += 43
    }
}

function computeSalatTimeFromRecord(b: string, heureAct: number, minAct: number) {
    b.split(',').find(function (v: string, i: number): boolean {
        if (i < 2) return false; //Skip month / day
        let p = v.split(':');
        nextSalatHour = parseFloat(p[0]);
        nextSalatMin = parseFloat(p[1]);
        if (nextSalatHour < heureAct) return false;
        if (nextSalatHour == heureAct && nextSalatMin <= minAct) return false;
        nextSalat = i - 1;
        debug("Next salat", nextSalatHour + ":" + nextSalatMin, " index :" + nextSalat);
        return true;
    });
}

function loadNextSalat(mois: number, jour: number, heureAct: number, minAct: number) {
    basic.showIcon(IconNames.SmallDiamond)
    debug("\r\nComputing next salat time.")

    if (!seekLineForDay(mois, jour)) {
        debug("No data line for " + jour + "/" + mois)
        basic.showIcon(IconNames.No)
        return;
    }
    computeSalatTimeFromRecord(f.readBuffer(43).toString(), heureAct, minAct)
    if (nextSalat >= 0) {
        basic.showIcon(IconNames.Yes)
        return;
    }

    debug("Not found today, checking tomorrow")

    if (jour < jdm(mois)) {
        jour = jour + 1
    } else {
        jour = 1
        mois = mois + 1
        if (mois > 12) {
            mois = 1
        }
    }

    if (!seekLineForDay(mois, jour)) {
        debug("No data line for " + jour + "/" + mois)
        basic.showIcon(IconNames.No)
        return;
    }
    computeSalatTimeFromRecord(f.readBuffer(43).toString(), 0, 0)
    if (nextSalat >= 0) {
        basic.showIcon(IconNames.Yes)
    } else {
        basic.showIcon(IconNames.No)
    }
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
let sleepTimeOutMillis = 0
let acc = 0
let wakeUpTime = 0
let f: files.File = null
let mois31: number[] = []
let fail = false
let nextSalat = 0
let b = ""
let nextSalatHour = 0
f = files.open("salatimes.txt")
let nextSalatMin = 0
let dataline = ""
let j = 0
let ds: DS1302.DS1302RTC = null
let jour = 0
let mois = 0
let m = 0
let n = 0
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
    let o = message;
    if (message2) o = o + message2;
    if (message3) o = o + message3;
    serial.writeLine(o)
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
        loadNextSalat(ds.getMonth(), ds.getDay(), ds.getHour(), ds.getMinute())
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
