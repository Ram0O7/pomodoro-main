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
let isTimeForLongBreak = false
isTimerStarted = false
let pomodoroCount = 2
let m = 1
let pomodoroDuration = 25
let totalSec = 25 * 60
let s = 0
let secondsNow = totalSec
let isTimerOn = false
let shortBreak = 1
let longBreak = 1
let IsOnBreak = false
timer = null

const updatePomodoro = (e, type) => {
    if (type === "pomodoro") { m = +e.target.value }
    if (type === "short-break") { shortBreak = +e.target.value }
    if (type === "long-break") { longBreak = +e.target.value }
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
function initilizeTimeVar(setPomodoroMin, isTimerStarted) {
    timeIntervals.forEach(interval => interval.classList.remove("active"))
    timeIntervals[0].classList.add("active")

    timerStatus.innerHTML = "START"
    timerDot.style.display = 'flex'
    currentTime.style.strokeDashoffset = 0
    pomodoroDuration = setPomodoroMin
    m = pomodoroDuration
    totalSec = pomodoroDuration * 60
    isTimerOn = true
    secondsNow = totalSec
    //clear previous pomodoro and initiate new one
    if (isTimerStarted)
        timer = setInterval(() => countdown(pomodoroDuration), 1000)
}

//Starting stage
minute.innerHTML = (m < 10) ? `0${m}` : m
second.innerHTML = (s < 10) ? `0${s}` : s
initilizeTimeVar(m, isTimerStarted)

function takeAShortBreak() {
    s = 1
    timeIntervals.forEach(interval => interval.classList.remove("active"))
    timeIntervals[1].classList.add("active")

    initilizeTimeVar(shortBreak, true)
}

function takeALongBreak() {
    s = 1
    timeIntervals.forEach(interval => interval.classList.remove("active"))
    timeIntervals[2].classList.add("active")
    
    initilizeTimeVar(longBreak, true)
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
        clearInterval(timer)
        if (pomodoroCount % 2 === 0) {
            pomodoroCount++
            console.log(pomodoroCount, "short")
            takeAShortBreak()
        } else if (pomodoroCount === 8) {
            pomodoroCount = 2
            console.log(pomodoroCount, "long")
            takeALongBreak()
        } else {
            pomodoroCount++
            console.log(pomodoroCount, "normal")
            s = 0
            initilizeTimeVar(m, true)
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
    if (!isOn) {
        clearInterval(timer)
        timerStatus.innerHTML = "START"
    } else {
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
    initilizeTimeVar(m, true)
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
