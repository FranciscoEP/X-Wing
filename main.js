const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

//Imágenes
const images = {
  board: 'images/zoey.png',
  player1: 'images/xwing2.png',
  bullet1: 'images/bulletBuenos.png',
  bullet2: 'images/BulletMalos.png',
  enemy: 'images/Caza.png',
}

//Variables globales
let frames = 0
let interval
const shoots = []
const ties = []
const pewpews = []

//Clases
class Board {
  constructor() {
    this.x = 0
    this.y = 0
    this.width = canvas.width
    this.height = canvas.height
    this.img = new Image()
    this.img.src = images.board
    this.img.onload = () => {
      this.draw()
    }
  }
  draw() {
    this.x--
    if (this.x < -this.width) this.x = 0
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
    ctx.drawImage(this.img, this.x + this.width, this.y, this.width, this.height)
  }
}

class Player {
  constructor() {
    this.x = 200
    this.y = 320
    this.width = 100
    this.height = 100
    this.img = new Image()
    this.img.src = images.player1
  }
  draw() {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
  }
  goUp() {
    this.y -= 20
  }
  goDown() {
    this.y += 20
  }
  goLeft() {
    this.x -= 20
  }
  goRight() {
    this.x += 20
  }
  shoot() {
    const gun = new Bullet(this.x, this.y, this.width, this.height)
    shoots.push(gun)
  }
  limite() {
    if (this.x > 620) {
      return (this.x -= 10)
    } else if (this.x < 10) {
      return (this.x += 10)
    } else if (this.y > 380) {
      return (this.y -= 10)
    } else if (this.y < 10) {
      return (this.y += 10)
    }
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 300
    this.height = 100
    this.img = new Image()
    this.img.src = images.bullet1
  }
  draw() {
    this.x += 15
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 100
    this.height = 100
    this.img = new Image()
    this.img.src = images.enemy
  }
  draw() {
    this.x--
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
  }
  shoot() {
    const gun = new Pewpew(this.x, this.y)
    pewpews.push(gun)
  }
}

class Pewpew {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 500
    this.height = 100
    this.img = new Image()
    this.img.src = images.bullet2
  }
  draw() {
    this.x -= 15
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
  }
}

// Objetos a instanciar
const background = new Board()
const player1 = new Player()

// funciones principales

function update() {
  frames++
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  background.draw()
  player1.draw()
  player1.limite()
  drawShoots()
  generateEnemies()
  drawEnemies()
}

function startGame() {
  if (interval) return
  interval = setInterval(update, 1000 / 60)
}

function gameOver() {
  clearInterval(interval)
}

function drawShoots() {
  shoots.forEach((shoot) => shoot.draw())
}

function generateEnemies() {
  if (frames % 200 === 0) {
    const random = Math.floor(Math.random() * canvas.height)
    const newEnemy = new Enemy(canvas.width, random)
    ties.push(newEnemy)
    newEnemy.shoot()
    console.log('Enemigo ', ties.length)
  }
}

function drawPewpew() {
  pewpews.forEach((pewpew) => pewpew.draw())
  console.log('pewpew')
}

function drawEnemies() {
  ties.forEach((caza) => caza.draw())
}

// funciones auxiliares

window.onload = function () {
  document.getElementById('start-button').onclick = function () {
    startGame()
  }
}

document.addEventListener('keyup', (e) => {
  switch (e.keyCode) {
    case 87:
      player1.goUp()
      break
    case 65:
      player1.goLeft()
      break
    case 68:
      player1.goRight()
      break
    case 83:
      player1.goDown()
      break
    case 74:
      player1.shoot()
  }
})
