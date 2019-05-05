const MAP_WIDTH = 1300;
const MAP_HEIGHT = 790;
const FIELDS_IN_COLUMN = 76;
const FIELDS_IN_ROW =  Math.floor(76*9/16);

//change names rows are actually columns


const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + '/static/', 'index.html'))
});

server.listen(5000, () => {
	console.log('server started');
});


let roomCount = 0;
let foodCount = 0;


class Game{
	constructor(){
		this.rooms = {};

	}

	handleDisconnect(s, r){
		this.rooms[r].removePlayer(s);
	}

	createAndAddRoom(){
		const room = new Room();
		this.addRoom(room);
		return room;
	}

	addRoom(room){
		this.rooms[room.id] = room;
	}

	update(){
		for(let room in this.rooms){
			this.rooms[room].update();
		}
	}

	sendInfoToClients(){
		for(let room in this.rooms){
			let data = this.prepareAndSendDataFor(room);		
			for(let player in this.rooms[room].players){
				io.sockets.server.clients().connected[player].emit('newData', data);
			}
		}
	}

	prepareAndSendDataFor(room){
		let data = {
			players:{},
			map: this.rooms[room].map,
			food : this.rooms[room].foodManager.food,
		};
		//console.log(data.map.matrix);

		for(let player in this.rooms[room].players){
			data.players[player] = this.rooms[room].players[player];
		}

		return data;
	}

}

class Room{
	constructor(maxPlayers = 2){
		this.players = {};
		this.foodManager = new FoodManager();
		this.playerCount = 0;
		this.id = `room-${roomCount}`;
		this.maxPlayers = maxPlayers;
		this.map = new Map();
		this.colliderChecker = new ColliiderChecker();
		roomCount += 1;

		this.foodManager.createFood();
	}

	get playersAmount(){
		return this.playerCount;
	}

	addPlayer(player){
		this.players[player.id] = player;
		this.updatePlayerCount();
	}

	removePlayer(id){
		delete this.players[id];
		this.updatePlayerCount();
	}

	updatePlayerCount(){
		this.playerCount = Object.keys(this.players).length;
	}

	update(){
		for(let player in this.players){
			if(this.players[player].alive){
				this.players[player].update();
				this.foodManager.checkForEats(this.players[player]);
				this.colliderChecker.checkCollisions(player, this.players)
			}
		}
	}



}

class ColliiderChecker{
	checkCollisions(collider, players){
		for(let player in players){
			this.checkCollisionWithPlayer(players[collider], players[player]);
		}
	}

	checkCollisionWithPlayer(collider, checked){
		if(!checked.alive){
			return false;
		}
		this.checkCollisionWithHead(collider, checked)
		this.checkCollisionWithTail(collider, checked);
	}

	checkCollisionWithHead(collider, checked){
		if(collider.id == checked.id){
			return false;	//own head
		}
		let colliderHead = collider.tail.head;
		let checkedHead = checked.tail.head;
		if(colliderHead.position.x == checkedHead.position.x && colliderHead.position.y == checkedHead.position.y){
			collider.handleDeath();//i could also add death for checked 
		}
	}

	checkCollisionWithTail(collider, checked){
		let colliderHead = collider.tail.head;
		let checkedTail = checked.tail.tailElements.elements;
		for(let i = 0; i < checkedTail.length; i+=1){
			if(colliderHead.position.x == checkedTail[i].position.x && colliderHead.position.y == checkedTail[i].position.y){
				collider.handleDeath();
			}
		}

	}
}

class FoodManager{
	constructor(){
		this.food = {};
	}

	checkForEats(player){
		for(let food in this.food){
			if(this.food[food].checkForEat(player)){
				this.food[food].getEated(player);
				delete this.food[food];
				this.createFood();
			}
		}
	}

	createFood(){
		this.food[`f-${foodCount}`] = new Food();
	}
}

class Food{
	constructor(){
		this.id = `f-${foodCount}`;
		this.position = new Position(Math.floor(Math.random()*FIELDS_IN_COLUMN), Math.floor(Math.random()*FIELDS_IN_ROW));	
		foodCount += 1;
	}

	checkForEat(player){
		if(player.tail.head.position.x == this.position.x && player.tail.head.position.y == this.position.y){
			return true;
		}
	}

	getEated(byPlayer){
		byPlayer.handleEat();
		//create new food
	}
}

class Map{
	constructor(){
		this.fieldsInRow = FIELDS_IN_ROW;
		this.fieldsInColumn = FIELDS_IN_COLUMN;
		this.fieldWidth = (MAP_WIDTH/FIELDS_IN_ROW);
		this.fieldHeight = (MAP_HEIGHT/FIELDS_IN_COLUMN);
		this.matrix = this.createGlobalMatrix();
	}

	createGlobalMatrix(){
		let width = this.fieldWidth;
		let height = this.fieldHeight;

		let matrix = [];

		for(let i = 0; i < this.fieldsInRow; i+= 1){
			let row = [];
			for(let j = 0; j < this.fieldsInColumn; j+= 1){
				row.push(new Field(j*width, i*height, j*width + width, i*height + height));
			}
			matrix.push(row);
		}
		return matrix;
	}
}

class Field{
	constructor(x,y,w = canvas.width/2,h,){
		this.occupiedBy = null;
		this.xStart = x;
		this.xEnd = x + w;
		this.yStart = y;
		this.yEnd = y + h;
	}

	occupy(fragment){
		this.occupiedBy = fragment;
	}

	clear(){
		this.occupiedBy = null;
	}
}

class Player{
	constructor(id){
		this.id = id;
		this.tail = new Tail(new Position(4,6));;
		this.movement = new Movement();
		this.alive = true;
	}

	findRoom(game){
		for(let room in game.rooms){
			if(game.rooms[room].maxPlayers > game.rooms[room].playersAmount){
				console.log('found')
				return game.rooms[room];
			}
		}
		return null;
	}

	joinRoom(room){
		if(!room){
			room = game.createAndAddRoom();
		}
		this.joinedRoomId = room.id;
		room.addPlayer(this);
		console.log(game.rooms[this.joinedRoomId].id)
	}

	update(){
		this.tail.update(this.movement);
	}


	handleEat(){
		this.tail.requestNewElement(this.tail.head.lastPosition);
	}

	handleDeath(){
		this.alive = false;
		console.log('ded');
	}
}

class Position{
	constructor(x, y){
		this.x = x;
		this.y = y;
	}

	changePositionByVector(x, y){
		this.x += x;
		this.y += y;
	}
}

class Movement{
	constructor(){
		this.direction = 'right';
		this.last = '';

		this.movementCaption = {
			'a': 'left',
			'd': 'right',
			'w': 'up',
			's': 'down',
		}

		this.oppositeMovement = {
			'left': 'right',
			'right': 'left',
			'up': 'down',
			'down': 'up',
		}

	}

	keyDownHandler(mov){
		let key = this.movementCaption[mov];
		let opposite = this.oppositeMovement[key];
		if(key !== undefined && this.last !== opposite){
			this.direction = key;
		}
	}

	keyUpHandler(mov){
		let key = this.movementCaption[mov];
		let opposite = this.oppositeMovement[key];
		if(key !== undefined && this.last != opposite){
			//do nothing
		}
	}


		handleMovement(tail){
			switch(this.direction){
				case 'left':
					this.move(-1, 0, tail);
				break;

				case 'right':
					this.move(1, 0, tail);
				break;

				case 'up':
					this.move(0, -1, tail);
				break;

				case 'down':
					this.move(0, 1, tail);
				break;
			}
			this.last = this.direction;
		}

		move(vX, vY, tail){
			tail.move(vX, vY)
		}
}

class Tail{
	constructor(position){
		this.tailElements = new Queue();
		this.head = new TailHead(position);
		this.tailLength = 0;
	}

	move(vX, vY){
		this.head.updatePositionByVector(vX, vY);
	}

	requestNewElement(position){
		let tE = new TailElement(new Position(position.x, position.y), this.tailLength);
		this.tailElements.add(tE);
		this.tailLength += 1;
	}

	updateTailElements(){
		this.tailElements.elements.forEach(el => {
			el.updatePosition(this.head, this.tailElements.elements);
		});
	}

	update(movement){
		movement.handleMovement(this);
		this.updateTailElements();
	}

}

class Queue{
	constructor(){
		this.elements = [];
		this.length = 0;
	}

	add(element){
		this.elements.push(element);
		this.length += 1;
	}

	takeElement(){
		this.length -= 1;
		return this.elements.shift();
	}
}

class TailElement{
	constructor(position, tailLength){
		this.position = position;
		this.lastPosition = {};
		if(tailLength>=0)
		this.index = tailLength;
	}


	updatePosition(head, elements){
		if(this.index === 0){
			this.lastPosition = {...this.position}
			this.position = {...head.lastPosition}
		}

		else if(this.index > 0){
			this.lastPosition = {...this.position};
			this.position = {...elements[this.index-1].lastPosition}
		}
	
	}
}

class TailHead extends TailElement{
		updatePositionByVector(vX, vY){
		this.lastPosition = {...this.position};
		this.position.changePositionByVector(vX, vY);
		if(this.position.y > FIELDS_IN_ROW-1){
			this.position.y = 0;
		}
		if(this.position.x > FIELDS_IN_COLUMN-1){
			this.position.x = 0;
		}
		if(this.position.y < 0){
			this.position.y = FIELDS_IN_ROW-1;
		}
		if(this.position.x < 0){
			this.position.x = FIELDS_IN_COLUMN-1;
		}
	}
}



const game = new Game();
const room = new Room();
game.addRoom(room);

io.on('connection', (socket) => {

	let connectedPlayer = new Player(socket.id);
	connectedPlayer.joinRoom(connectedPlayer.findRoom(game));
	socket.on('keyDown', (mov) => {
		connectedPlayer.movement.keyDownHandler(mov);
	});

	socket.on('disconnect', () => {
		game.handleDisconnect(socket.id, connectedPlayer.joinedRoomId);
	});

	socket.on('keyUp', (mov) => {
		connectedPlayer.movement.keyUpHandler(mov);
	});
})

	//console.log(io.sockets.server.clients().connected)
setInterval(() => {
	game.update();
	game.sendInfoToClients();
}, 1000/15);