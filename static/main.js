const socket = io();

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let initData = null;



class Map{
	constructor(){
		this.fields = null;
	}

	set(data){
		this.fieldsInRow = data.fieldsInRow;
		this.fieldsInColumn = data.fieldsInColumn;
		this.fieldWidth = data.fieldWidth;
		this.fieldHeight = data.fieldHeight;
		this.fields = data.matrix;
	}

	update(fields){
		this.fields = fields;
	}

	draw(){
		this.clear();
		//rows
		for(let i = 0; i < this.fieldsInColumn; i+=1){
				//this.drawField(this.fields[i][j]);
				this.drawHorizontal(i*this.fieldHeight)
		}
		for(let i = 0; i < this.fieldsInRow; i+= 1){
				this.drawVertical(i*this.fieldWidth)
		}
	}

	clear(){
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	drawHorizontal(y){
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.stroke();
	}

	drawVertical(x){
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.stroke();
	}

	fillField(field){
		ctx.rect(field.xStart, field.yStart, field.xEnd, field.yEnd);
		ctx.stroke();
	}
}

const gameMap = new Map();


class Client{
	constructor(){
		this.id = socket.id;
	};

	addMovement(movement){
		this.movement = movement;
	}

	drawAllPlayers(players){
		for(let p in players){
			let isPlayer = (p === socket.id);
			Snake.draw(players[p], isPlayer)
		}
	}
}

class Movement{

	keyDownHandler(e){
		socket.emit('keyDown', e.key.toLowerCase())
	}

	keyUpHandler(e){
		socket.emit('keyUp', e.key.toLowerCase())
	}
}

class Snake{
	static draw(snake, player){
		this.drawHead(snake.tail.head.position, player);
		this.drawAllTailFragments(snake.tail.tailElements, player);
	}

	static drawHead(pos, p){
		if(p){
			ctx.fillStyle = "#FF0000";
		}
		ctx.fillRect(pos.x*gameMap.fieldWidth, pos.y * gameMap.fieldHeight, gameMap.fieldWidth,  gameMap.fieldHeight);
			ctx.fillStyle = "#000000";
	}

	static drawAllTailFragments(fragments){
		fragments.elements.forEach(fragment => {
			this.drawTailFragment(fragment.position);
		});
	}

	static drawTailFragment(pos){
		ctx.fillRect(pos.x*gameMap.fieldWidth, pos.y * gameMap.fieldHeight, gameMap.fieldWidth,  gameMap.fieldHeight);
	}
}

class Food{
	static drawAll(foods){
		for (let f in foods){
			Food.draw(foods[f].position.x, foods[f].position.y);
		};
	}
	static draw(x, y){
		ctx.fillStyle = "#FFFF00";
		ctx.beginPath();
		ctx.arc(x*gameMap.fieldWidth + gameMap.fieldWidth/2, y * gameMap.fieldHeight + gameMap.fieldHeight/2, gameMap.fieldHeight/2, 0, 2 * Math.PI)
		ctx.fill();
		ctx.fillStyle = "#000000";

	}
}


player = new Client();
player.addMovement(new Movement);

document.addEventListener('keydown', (e) => {
	player.movement.keyDownHandler(e)
});
document.addEventListener('keyup', (e) =>  {
	player.movement.keyUpHandler(e)
});

let initDataReceived = false;
socket.on('newData', (data) => {
	if(!initDataReceived){
		gameMap.set(data.map);
		initDataReceived = true;
	}
	console.log(data.players);

	gameMap.draw();
	player.drawAllPlayers(data.players);
	Food.drawAll(data.food);

})
