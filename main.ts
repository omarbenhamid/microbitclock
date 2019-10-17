// proocole:
// MM,DD,FH:FM,CH:CM,DH:DM,AH:AM,MH:MM,IH:IM$ =>
// Umpdate calender of given day
//
//
// will create st-MMDD.txt with the data sent until $
//
// C is for chourouk
//
// type #$ to cancel line completely

function serialHelp() {
    serial.writeLine("\r\nSerial Interface :")
    serial.writeLine("SETDT YYYY,MM,DD,DOW,HH,MM$ : DOW is day of week : 1 = monday")
    serial.writeLine("DUMPTIMES$: get the full timesheet")
    serial.writeLine("MM,DD,FH:FM,CH:CM,DH:DM,AH:AM,MH:MM,IH:IM$ : add / update timesheet entry ")
}


function serialFail(message: string = null) {
    serial.writeLine("\r\n")
    if (message) serial.writeLine(message);
    serialHelp()
    serialFinish("FAILED")
}

function serialFinish(message: string = null) {
    if (message) serial.writeString(message);
    serial.writeString("\r\n$");
}

serial.onDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    basic.showIcon(IconNames.TShirt)
    let dataline: string = serial.readUntil(serial.delimiters(Delimiters.Dollar))

    if (dataline.indexOf('#') >= 0) {
        serialFinish("\r\n Command ignored : contains #")
        return;
    }

    if (dataline.substr(0, 6) == "SETDT ") {
        let data = dataline.split(' ')[1].split(',').map(parseInt);
        serial.writeNumber(data.length)
        if (data.length != 6) {
            serialFail("BAD date time format: expected YYYY,MM,DD,DOW,HH,MM");
            return;
        }
        ds.DateTime(data[0], data[1], data[2], data[3], data[4], data[5], 0);
        nextSalat = -1


        serialFinish("Ok")
        return;
    }

    if (dataline.indexOf("DUMPTIMES") == 0) {
        serial.writeLine("Dumping salat times file")
        f.seek(0, FileSystemSeekFlags.Set)
        let b: Buffer = null;
        do {
            b = f.readBuffer(64)
            serial.writeBuffer(b)
        } while (b.length > 0)
        serialFinish("\r\n done")
        return;
    }


    if (dataline.length != 41) {
        serialFail("Bad format : line must be 41 characters, " + dataline.length + " found")
        return;
    }

    serial.writeString("\r\nProcessing:")

    let data = dataline.split(',')

    if (data.length != 8) {
        serialFail("Bad format: 8 columns required")
        return;
    }
    let mois = parseInt(data[0])
    if (!(mois >= 1 && mois <= 12)) {
        serialFail("Bad format: Col 1 (month) must be a number between 1 and 12")
        return;
    }
    let jour = parseInt(data[1])
    if (!(jour >= 1 && jour <= 31)) {
        serialFail("Bad format: Col 2 (day) must be a number between 1 and 31")
        return;
    }

    if (!seekLineForDay(mois, jour))
        f.seek(0, FileSystemSeekFlags.End)

    f.writeString(dataline + "\r\n")
    f.flush()
    nextSalat = -1
    serialFinish("Done")
    basic.showIcon(IconNames.Yes)
})

function seekLineForDay(mois: number, jour: number, startpos: number = 0): boolean {
    let ret = 0
    f.seek(startpos, FileSystemSeekFlags.Set)

    while (true) {
        b = f.readBuffer(43).toString();
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
    computeSalatTimeFromRecord(f.readBuffer(41).toString(), heureAct, minAct)
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
    computeSalatTimeFromRecord(f.readBuffer(41).toString(), 0, 0)
    if (nextSalat >= 0) {
        basic.showIcon(IconNames.Yes)
    } else {
        basic.showIcon(IconNames.No)
    }
}

function checkAdhan(h: number, m: number): boolean {
    if (nextSalat < 0) {
        return false;
    }
    return (nextSalatMin == m && nextSalatHour % 24 == h);
}


input.onButtonPressed(Button.A, function () {
    doAdhan()
})

function doAdhan() {
    basic.showIcon(IconNames.Butterfly)
    for (let i = 0; i < (nextSalat - 1); i++) {
        music.playTone(Note.E5, music.beat(BeatFraction.Whole))
        basic.pause(400)
    }

    if (nextSalat != 2) {
        let count = nextSalat == 1 ? 4 : 2
        for (let i = 0; i < count; i++) {
            music.playTone(Note.C, music.beat(BeatFraction.Breve))
            music.playTone(Note.A, music.beat(BeatFraction.Half))
            music.playTone(Note.B3, music.beat(BeatFraction.Breve))
        }
    }

    basic.showString("Allaho Akbar")
    nextSalat = -1
}
function updateSleepState(forceWake: boolean = false) {
    let nacc = input.acceleration(Dimension.Strength)
    // Reveiller ou prologer le reveil si activiter
    // accelrometre
    if (Math.abs(nacc - acc) > 50 || forceWake) {
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

let sleepTimeOutMillis = 0
let acc = 0
let wakeUpTime = 0
let f: files.File = null
let mois31: number[] = [1, 3, 5, 7, 8, 10, 12]
let salatNames: string[] = ['Fajr', 'Chorok', 'Dohr', 'Asr', 'Maghrib', 'Ishaa']
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
serial.redirectToUSB()
serial.setRxBufferSize(50)
serial.setTxBufferSize(50)
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
    let adhan = checkAdhan(ds.getHour(), ds.getMinute())

    updateSleepState(adhan)
    if (nextSalat < 0) {
        loadNextSalat(ds.getMonth(), ds.getDay(), ds.getHour(), ds.getMinute())
        OLED12864_I2C.clear()
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
        if (nextSalat > 0) {
            OLED12864_I2C.showString(
                0,
                2,
                salatNames[nextSalat - 1] + ":" + toTwoDigitText(nextSalatHour) + ":" + toTwoDigitText(nextSalatMin),
                1
            )
        }
    }
    if (adhan) doAdhan()
})
