input.onGesture(Gesture.Shake, function () {
    wakeUp()
})
function wakeUp () {
    wakeUpTime = input.runningTime()
    OLED12864_I2C.on()
    basic.showIcon(IconNames.Happy)
}
input.onButtonPressed(Button.B, function () {
    wakeUp()
})
input.onButtonPressed(Button.A, function () {
    wakeUp()
})
let wakeUpTime = 0
wakeUpTime = input.runningTime()
let sleepTimeOutMillis = 5000
function toTwoDigitText(num: number) {
    if (num < 10) return "0" + convertToText(num);
    else return convertToText(num);
}
let ds = DS1302.create(DigitalPin.P11, DigitalPin.P12, DigitalPin.P13)
ds.start()
OLED12864_I2C.init(60)
OLED12864_I2C.on()
basic.forever(function () {
    if (wakeUpTime >= 0 && input.runningTime() > wakeUpTime + sleepTimeOutMillis) {
        wakeUpTime = -1
        OLED12864_I2C.off()
        basic.showIcon(IconNames.Asleep)
        basic.pause(500)
        basic.showLeds(`
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            `)
    }
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
})
