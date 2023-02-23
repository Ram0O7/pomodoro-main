const currentTime = document.getElementById("current-time")
const timerDot = document.getElementById('time-dot')
const minute = document.getElementById('minute')
const second = document.getElementById('second')
const closeModel = document.getElementById('close')
const timeContainer = document.querySelector('.time-container')
const timerStatus = document.querySelector('.status')
const modelOverlay = document.querySelector('.overlays')
const settingBtn = document.querySelector('.settings')

const setPomodoro = 5
const theme = document.documentElement.classList
let m = setPomodoro
const totalSec = setPomodoro * 60
let s = 0
let secondsNow = m * 60
let isTimerOn = true

// opent settings layout when clicked on settings button
settingBtn.addEventListener("click", () => {
    modelOverlay.style.display = "flex"
})

// close model on close button press
closeModel.addEventListener("click", () => {
    modelOverlay.style.display = "none"
    console.log("close button clicked")
})

//countdown logic
function countdown() {
    let minutes = (m < 10) ? `0${m}` : m
    let seconds = (s < 10) ? `0${s}` : s

    minute.innerHTML = minutes
    second.innerHTML = seconds

    if (s === 0) {
        s = 60
        m--
    }

    if (m < 0) {
        timerDot.style.display = 'none'
        currentTime.style.strokeDashoffset = 880
        clearInterval(timer)
    }
    s--
    secondsNow--
    // animating svg stroke to match the current time position
    if (currentTime.style.strokeDashoffset < 880)
        currentTime.style.strokeDashoffset = 880 - (880 * (secondsNow)) / (totalSec)
    // rotating dot according to the no of sections
    timerDot.style.transform = `rotate(${(360 / setPomodoro) * (secondsNow / 60)}deg)`
}

//initializing countdown
let timer = setInterval(countdown, 1000)
//function to stop toggle the timer
const stopPomodoro = (isOn) => {
    if (isOn) {
        clearInterval(timer)
        timerStatus.innerHTML = "START"
    } else {
        timerStatus.innerHTML = "PAUSE"
        setTimeout(() => {
            clearInterval(timer)
            timer = setInterval(countdown, 1000)
        }, 1000)
    }
    isTimerOn = !isOn
}

timeContainer.addEventListener("click", () => stopPomodoro(isTimerOn))
// changing theme
theme.add("theme1")