const currentTime = document.getElementById("current-time")
const timerDot = document.getElementById('time-dot')
const minute = document.getElementById('minute')
const second = document.getElementById('second')
const closeModel = document.getElementById('close')
const timeContainer = document.querySelector('.time-container')
const timerStatus = document.querySelector('.status')
const modelOverlay = document.querySelector('.overlays')
const settingBtn = document.querySelector('.settings')
const settingControl = document.querySelector('.apply-setting')
const pomodoroInput = document.getElementById('pomodoro')
const shortBreakInput = document.getElementById('short-break')
const longBreakInput = document.getElementById('long-break')
const fonts = document.querySelectorAll(".font")
const colors = document.querySelectorAll(".color")
const timeIntervals = document.querySelectorAll(".btn")

// collecting caches stored in serviceWorker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

//getting voice istructions
const startVoice = new Audio('start.mp3')
const shortBreakVoice = new Audio('short-break.mp3')
const longBreakVoice = new Audio('long-break.mp3')
//get theme and font from local storage
const getStorageTheme = () => {
    let theme = "theme1"
    if (localStorage.getItem("pomo-theme")) {
        theme = localStorage.getItem("pomo-theme")
        return theme
    }
    return theme
}

const getStorageFont = () => {
    let font = "Poppins"
    if (localStorage.getItem("pomo-font")) {
        font = localStorage.getItem("pomo-font")
        return font
    }
    return font
}

//get pomodoro setting
const getStorageSettings = () => {
    const setting = [25, 5, 30];
    const pomoSetting = JSON.parse(localStorage.getItem("pomo-setting"))
    if (pomoSetting) {
        return pomoSetting
    }
    return setting
}

//getting initial font and color
colors.forEach(color => {
    if (color.id === getStorageTheme()) {
        color.innerHTML = "&check;"
    }
})
fonts.forEach(font => {
    if (font.style.fontFamily === getStorageFont()) {
        font.classList.add("font-active")
    }
})

//time variables
let pomodoroCount = 2
let m = getStorageSettings()[0]
let pomodoroDuration = m
let totalSec = m * 60
let s = 0
let secondsNow = totalSec
let isTimerOn = false
let shortBreak = getStorageSettings()[1]
let longBreak = getStorageSettings()[2]
timer = null

//update setting values
const pomoSettings = () => {
    pomodoroInput.value = m
    shortBreakInput.value = shortBreak
    longBreakInput.value = longBreak
}


const updatePomodoro = (e, type) => {
    if (type === "pomodoro") { m = +e.target.value }
    if (type === "short-break") { shortBreak = +e.target.value }
    if (type === "long-break") { longBreak = +e.target.value }
    initilizeTimeVar(m, 0)
}

const handleInputChange = (e, type) => {
    updatePomodoro(e, type)
}
// changing setting based on the input
pomodoroInput.addEventListener("change", (e) => handleInputChange(e, "pomodoro"))
shortBreakInput.addEventListener("change", (e) => handleInputChange(e, "short-break"))
longBreakInput.addEventListener("change", (e) => handleInputChange(e, "long-break"))

// opent settings layout when clicked on settings button
settingBtn.addEventListener("click", () => {
    modelOverlay.style.display = "flex"
})

// close model on close button press
closeModel.addEventListener("click", () => {
    modelOverlay.style.display = "none"
})

//countdown logic
function initilizeTimeVar(setPomodoroMin, setPomodoroSec) {
    clearInterval(timer)
    timerDot.style.display = 'flex'
    currentTime.style.strokeDashoffset = 0
    pomodoroDuration = setPomodoroMin
    s = setPomodoroSec
    m = setPomodoroMin
    totalSec = pomodoroDuration * 60
    secondsNow = totalSec
    //clear previous pomodoro and initiate new one
    timer = setInterval(() => countdown(setPomodoroMin), 1000)
}

//Starting stage
pomoSettings()
timerStatus.innerHTML = "START"
timeIntervals[0].classList.add("active")
minute.innerHTML = (m < 10) ? `0${m}` : m
second.innerHTML = (s < 10) ? `0${s}` : s
if (isTimerOn) initilizeTimeVar(m, s)

function takeAShortBreak() {
    timeIntervals.forEach(interval => interval.classList.remove("active"))
    timeIntervals[1].classList.add("active")
    shortBreakVoice.play()
    initilizeTimeVar(shortBreak, 1)
}

function takeALongBreak() {
    timeIntervals.forEach(interval => interval.classList.remove("active"))
    timeIntervals[2].classList.add("active")
    longBreakVoice.play()
    initilizeTimeVar(longBreak, 1)
}

function countdown(pomodoroDuration) {

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
        if (pomodoroCount % 8 === 0) {
            pomodoroCount = 1
            takeALongBreak()
        } else if (pomodoroCount % 2 === 0) {
            pomodoroCount++
            takeAShortBreak()
        } else {
            pomodoroCount++
            timeIntervals.forEach(interval => interval.classList.remove("active"))
            timeIntervals[0].classList.add("active")
            startVoice.play()
            initilizeTimeVar(pomodoroDuration, 1)
        }
    }
    s--
    secondsNow--
    // animating svg stroke to match the current time position
    if (currentTime.style.strokeDashoffset < 880)
        currentTime.style.strokeDashoffset = 880 - (880 * (secondsNow)) / (totalSec)
    // rotating dot according to the no of sections
    timerDot.style.transform = `rotate(${(360 / (pomodoroDuration)) * (secondsNow / 60)}deg)`
}

//function to stop toggle the timer
const stopPomodoro = (isOn) => {
    if (isOn) {
        if (timer) clearInterval(timer)
        timerStatus.innerHTML = "START"
    } else {
        new Audio('start.mp3').play()
        timerStatus.innerHTML = "PAUSE"
        setTimeout(() => {
            clearInterval(timer)
            timer = setInterval(() => countdown(pomodoroDuration), 1000)
        }, 1000)
    }
    isTimerOn = !isOn
}

settingControl.addEventListener("click", () => {
    modelOverlay.style.display = "none"
    isTimerOn = true
    timerStatus.innerHTML = "PAUSE"
    localStorage.setItem("pomo-setting", JSON.stringify([m, shortBreak, longBreak]))
    initilizeTimeVar(m, 0)
    startVoice.play()
})
//stoping pomodoro on click
timeContainer.addEventListener("click", () => stopPomodoro(isTimerOn))
// changing font and theme of the page
fonts.forEach((font) => {
    font.addEventListener("click", () => {
        document.documentElement.style.setProperty("--font-face", font.style.fontFamily)
        localStorage.setItem("pomo-font", font.style.fontFamily)
        fonts.forEach(font => font.classList.remove("font-active"))
        font.classList.add("font-active")
    })
})

colors.forEach((color) => {
    color.addEventListener("click", () => {
        document.documentElement.className = color.id
        localStorage.setItem("pomo-theme", color.id)
        colors.forEach(color => color.innerHTML = "")
        color.innerHTML = "&check;"
    })
})

document.documentElement.className = getStorageTheme()
document.documentElement.style.setProperty("--font-face", getStorageFont())
