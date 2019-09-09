function loadNextSalat (mois: number, jour: number, heureAct: number, minAct: number) {
    basic.showIcon(IconNames.SmallDiamond)
    files.readToSerial("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    f = files.open("st-" + toTwoDigitText(mois) + toTwoDigitText(jour) + ".txt")
    b = f.readBuffer(64).toString()
f.close()
    b.split(' ').find(function (v: string, i: number): boolean {
        let p = v.split(':');
        serial.writeLine("V" + v);
        nextSalatHour = parseFloat(p[0]);
        nextSalatMin = parseFloat(p[1]);

        serial.writeLine("N" + nextSalatHour + ":" + nextSalatMin);
        if (nextSalatHour < heureAct) return false;
        if (nextSalatHour == heureAct && nextSalatMin <= minAct) return false;
        nextSalat = i + 1;
        return true;
    });
basic.showIcon(IconNames.Yes)
}
function updateSleepState () {
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
input.onButtonPressed(Button.A, function () {
    nextSalat = -1
})
// proocole:
//
// MMDD:FH:FM CH:CM DH:DM AH:AM MH:MM IH:IM$
//
//
// will create st-MMDD.txt with the data sent until $
//
// C is for chourouk
serial.onDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    basic.showIcon(IconNames.TShirt)
    f = files.open("st-" + serial.readUntil(serial.delimiters(Delimiters.Colon)) + ".txt")
    f.close()
    f.remove()
    f.open()
    f.writeString(serial.readUntil(serial.delimiters(Delimiters.Dollar)))
    f.close()
    nextSalat = -1
    basic.showIcon(IconNames.Yes)
})
let nacc = 0
let sleepTimeOutMillis = 0
let acc = 0
let wakeUpTime = 0
let b = ""
let f: files.File = null
let nextSalat = 0
serial.redirectToUSB()
let nextSalatHour = -1
let nextSalatMin = -1
nextSalat = -1
wakeUpTime = input.runningTime()
acc = input.acceleration(Dimension.Strength)
sleepTimeOutMillis = 5000
function toTwoDigitText(num: number) {
    if (num < 10) return "0" + convertToText(num);
    else return convertToText(num);
}
let ds = DS1302.create(DigitalPin.P13, DigitalPin.P14, DigitalPin.P15)
ds.start()
OLED12864_I2C.init(60)
OLED12864_I2C.on()
basic.forever(function () {
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
