const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

//Imágenes
const images = {
  board: 'images/zoey.png',
  player1: 'images/xwing2.png',
  player2: 'images/Player2.png',
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
  constructor(x, y, sprite) {
    this.x = x
    this.y = y
    this.width = 100
    this.height = 100
    this.img = new Image()
    this.img.src = sprite
    this.hp = 10
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
  istouching(thing) {
    return (
      this.x < thing.x + thing.width &&
      this.x + this.width > thing.x &&
      this.y < thing.y + thing.height &&
      this.y + this.height > thing.y
    )
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 20
    this.height = 10
    this.img = new Image()
    this.img.src = images.bullet1
  }
  draw() {
    this.x += 35
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
    ctx.drawImage(this.img, this.x, this.y + 90, this.width, this.height)
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x
    this.y = y - 100
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
    pewpews.push(new Pewpew(this.x - 100, this.y))
    pewpews.push(new Pewpew(this.x - 200, this.y))
    pewpews.push(new Pewpew(this.x, this.y))
  }
  istouching(thing) {
    return (
      this.x < thing.x + thing.width &&
      this.x + this.width > thing.x &&
      this.y < thing.y + thing.height &&
      this.y + this.height > thing.y
    )
  }
}

class Pewpew {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 30
    this.height = 5
    this.img = new Image()
    this.img.src = images.bullet2
  }
  draw() {
    this.x -= 30
    ctx.drawImage(this.img, this.x, this.y + 50, this.width, this.height)
  }
}

// Objetos a instanciar
const background = new Board()
const player1 = new Player(200, 300, images.player1)
const player2 = new Player(200, 100, images.player2)

// funciones principales

function update() {
  frames++
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  background.draw()
  player1.draw()
  player1.limite()
  player2.draw()
  player2.limite()
  drawShoots()
  generateEnemies()
  drawEnemies()
  checkCollisionP1()
  checkCollisionP2()
  checkCollision2()
}

function startGame() {
  if (interval) return
  interval = setInterval(update, 1000 / 60)
}
function winTheGame() {
  if (player1.hp <= 0) {
    ctx.fillStyle = 'red'
    ctx.font = '40px Georgia'
    ctx.fillText('Player 2 has won the game', 150, 150)
  } else if (player2.hp <= 0) {
    ctx.fillStyle = 'red'
    ctx.font = '40px Georgia'
    ctx.fillText('Player 1 has won the game', 150, 150)
  }
}
function gameOver() {
  clearInterval(interval)
  console.log('perdiste')

  winTheGame()
}

function drawShoots() {
  shoots.forEach((shoot) => shoot.draw())
}

function generateEnemies() {
  /*generar varios disparos*/

  if (frames % 60 === 0) {
    const random = Math.floor(Math.random() * canvas.height)
    const newEnemy = new Enemy(canvas.width, random)
    ties.push(newEnemy)
    newEnemy.shoot()
    console.log('Enemigo ', ties.length)
  }
}

function enemieBullets() {
  ties.forEach((tie) => {})
}

function drawPewpew() {
  pewpews.forEach((pewpew) => pewpew.draw())
}

function drawEnemies() {
  ties.forEach((caza) => caza.draw())
  drawPewpew()
}

function checkCollisionP1() {
  pewpews.forEach((pewpew, indexPewpew) => {
    if (player1.istouching(pewpew)) {
      player1.hp -= 1
      pewpews.splice(1, indexPewpew)

      console.log('Te quedan ' + player1.hp)
    }

    if (player1.hp === 0) return gameOver()
  })
}

function checkCollisionP2() {
  pewpews.forEach((pewpew, indexPewpew) => {
    if (player2.istouching(pewpew)) {
      player2.hp -= 1
      pewpews.splice(1, indexPewpew)

      console.log('Te quedan ' + player2.hp)
    }

    if (player2.hp === 0) return gameOver()
  })
}

function checkCollision2() {
  shoots.forEach((shoot, indexShoots) => {
    ties.forEach((tie, indexTies) => {
      if (tie.istouching(shoot)) {
        shoots.splice(indexShoots, 1)
        ties.splice(indexTies, 1)
      }
    })
  })
}

// function checkCollision2() {
//   shoots.forEach((shoot, shootIndex) => {
//     ties.forEach((tie) => {
//       if (tie.istouching(shoot)) return shoots.splice(1, i)
//     })
//   })
// }

// funciones auxiliares

window.onload = function () {
  document.getElementById('start-button').onclick = function () {
    startGame()
  }
}

document.addEventListener('keydown', (e) => {
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
      break
    case 38:
      player2.goUp()
      break
    case 37:
      player2.goLeft()
      break
    case 39:
      player2.goRight()
      break
    case 40:
      player2.goDown()
      break
    case 76:
      player2.shoot()
  }
})
