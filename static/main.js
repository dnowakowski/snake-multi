const socket = io();

const body = document.querySelector('body');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let initData = null;



class Map{
	constructor(){
		this.fields = null;
	}

	set(data){
		this.setCanvasWidth();
		this.fieldsInRow = data.fieldsInRow;
		this.fieldsInColumn = data.fieldsInColumn;
		this.fields = data.matrix;
		this.setWidths();
	}

	setWidths(){
		this.fieldWidth = this.canvasWidth/this.fieldsInColumn;
		this.fieldHeight = this.canvasHeight/this.fieldsInRow;
	}

	setCanvasWidth(){
		let bodyWidth = body.offsetWidth;
		let bodyHeight = body.offsetHeight;
		let ratio = canvas.width / canvas.height;
		canvas.width = bodyWidth;
		canvas.height = bodyHeight;
		if(ratio < 16/9){
			canvas.height = canvas.width * 9/16;
		}
		else{
			canvas.width = canvas.height*16/9;
		}
		

		this.canvasWidth = canvas.width;
		this.canvasHeight = canvas.height;
	}

	update(fields){
		this.fields = fields;
	}

	draw(){
		this.drawBackground();
		this.drawGrid(0.2);
	}

	clear(){
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	drawBackground(){
		ctx.fillStyle = "lightgreen";
		ctx.fillRect(0,0, canvas.width, canvas.height);
		ctx.fillStyle = "black";
	}

	drawGrid(lineWidth){
		ctx.lineWidth = lineWidth;
		this.drawHorizontalLines();
		this.drawVerticalLines();
		ctx.lineWidth = 1;
	}

	drawHorizontalLines(){
		for(let i = 0; i < this.fieldsInColumn; i+=1){
			this.drawHorizontal(i*this.fieldWidth)
		}	
	}

	drawHorizontal(y){
		ctx.beginPath();
		ctx.moveTo(y, 0);
		ctx.lineTo(y, canvas.height);
		ctx.stroke();
	}

	drawVerticalLines(){
		for(let i = 0; i < this.fieldsInRow; i+= 1){
			this.drawVertical(i*this.fieldHeight)
		}
	}

	drawVertical(x){
		ctx.beginPath();
		ctx.moveTo(0, x);
		ctx.lineTo(canvas.width, x);
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
			if(!players[p].alive){
				continue;
			}
			if(p === socket.id){
				Player.draw(players[p]);
			}
			else{
				Snake.draw(players[p])
			}
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
	static draw(snake){
		this.drawHead(snake.tail.head.position, player);
		this.drawAllTailFragments(snake.tail.tailElements);
	}

	static drawHead(pos){
		ctx.fillRect(pos.x*gameMap.fieldWidth, pos.y * gameMap.fieldHeight, gameMap.fieldWidth,  gameMap.fieldHeight);
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

class Player extends Snake{
	static drawHead(pos){
		ctx.fillStyle = "#0000FF";
		super.drawHead(pos);
		ctx.fillStyle = "#000000";
	}
}

class Food{
	static drawAll(foods){
		for (let f in foods){
			Food.draw(foods[f].position.x, foods[f].position.y);
		};
	}
	static draw(x, y){
		ctx.fillStyle = "#FF0000";
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

window.addEventListener('resize', (e) => {
	gameMap.setCanvasWidth();
	gameMap.setWidths();
});	

let initDataReceived = false;
socket.on('newData', (data) => {

	if(!initDataReceived){
		gameMap.set(data.map);
		initDataReceived = true;
	}

	gameMap.draw();
	player.drawAllPlayers(data.players);
	if(!data.players[socket.id].alive){
		//draw gameover/respawn screen
	}
	Food.drawAll(data.food);

})
