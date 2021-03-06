// Declarar todos los objetos de uso como variables por conveniencia
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

var blockedLevel = 0;
//preparar requestAnimationFrame y cancelAnimationFrame para su uso
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());

$(window).load(function () {
    game.init();
});

var game = {
    // Inicialización de objetos, precarga de elementos y pantalla de inicio
    //modo Juego
    mode: "intro",
    //coordenadas X & Y del tirachinas
    slingshotX: 140,
    slingshotY: 280,
    // Velocidad máxima de panoramización por fotograma en píxeles
    maxSpeed: 3,
    // Desplazamiento de panorámica actual
    offsetLeft: 0,
    //minimo y maximo desplazamiento panoramico
    minOffset: 0,
    maxOffset: 300,
    //la puntuacion del juego
    scrore: 0,
    decelerating: 0,
    //No hay sonido
    noSound: true,

    init: function () {
        //inicializar objetos
        loader.init();
        mouse.init();
        // Cargar todos los efectos de sonido y musica de fondo
        game.backgroundMusic = loader.loadSound('assets/sounds/Survive-the-Fall');
        game.slingshotReleasedSound = loader.loadSound("assets/sounds/released");
        game.bounceSound = loader.loadSound('assets/sounds/bounce');
        game.bouncehitSound = loader.loadSound('assets/sounds/hit');
        game.clickSound = loader.loadSound('assets/sounds/clicksound');
        game.breakSound = {
            "espiral": loader.loadSound('assets/sounds/espiralbreak'),
            "bloque": loader.loadSound('assets/sounds/blockbreak')
        };

        // Ocultar todas las capas del juego y mostrar la pantalla de inicio
        $('.gamelayer').hide();
        $('#gamestartscreen').show();

        //Obtener el controlador para el lienzo de juego y el contexto
        game.canvas = $('#gamecanvas')[0];
        game.context = game.canvas.getContext('2d');
    },
    startBackgroundMusic: function () {
        var toggleImage = $("#togglemusic")[0];
        game.backgroundMusic.play();
        toggleImage.src = "assets/images/sound.png";
    },
    stopBackgroundMusic: function () {
        var toggleImage = $("#togglemusic")[0];
        toggleImage.src = "assets/images/nosound.png";
        game.backgroundMusic.currentTime = 0; // Ir al comienzo de la canción
    },
    toggleBackgroundMusic: function () {
        if (game.backgroundMusic.paused) {
            game.backgroundMusic.play();
            $("#togglemusic")[0].src = "assets/images/sound.png";
        } else {
            game.backgroundMusic.pause();
            $("#togglemusic")[0].src = "assets/images/nosound.png";
        }
        game.noSound = !game.noSound;
    },
    goHomePage: function () {
        game.clickSound.play();
        $('#gamecanvas').removeClass('blurBackground');
        $('#scorescreen').hide();
        $('#levelselectscreen').hide();
        $('#gamestartscreen').show();
    },
    showLevelScreen: function () {
        levels.init();
        game.clickSound.play();
        $('#gamecanvas').removeClass('blurBackground');
        $('#gobackbutton').attr('src', 'assets/images/return.png');
        $('.gamelayer').hide();
        $('#levelselectscreen').show('slow');
        $('#scorescreen').show();
        $('#gobackbutton').attr('onclick', 'game.goHomePage();');
        $('#score').hide();
    },
    restartLevel: function () {
        $('#gamecanvas').removeClass('blurBackground');
        window.cancelAnimationFrame(game.animationFrame);
        game.lastUpdateTime = undefined;
        levels.load(game.currentLevel.number);
    },
    nextLevel: function () {
        $('#gamecanvas').removeClass('blurBackground');
        window.cancelAnimationFrame(game.animationFrame);
        game.lastUpdateTime = undefined;
        levels.load(game.currentLevel.number + 1);
    },
    start: function () {
        game.clickSound.play();
        $('.gamelayer').hide();
        $('#gobackbutton').attr('onclick', 'game.restartLevel();');
        $('#gobackbutton').attr('src', 'assets/images/retry.png');
        $('#score').show();
        $('#scorescreen').show();
        //mostrar canvar y score
        $('#gamecanvas').show();
        game.mode = "intro";
        game.offsetLeft = 0;
        game.ended = false;
        game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
    },
    //Despliegue la pantalla para centrarse en newCenter
    panTo: function (newCenter) {
        if (Math.abs(newCenter - game.offsetLeft - game.canvas.width / 4) > 0
            && game.offsetLeft <= game.maxOffset && game.offsetLeft >= game.minOffset) {

            var deltaX = Math.round((newCenter - game.offsetLeft - game.canvas.width / 4) / 2);
            if (deltaX && Math.abs(deltaX) > game.maxSpeed) {
                deltaX = game.maxSpeed * Math.abs(deltaX) / (deltaX);
            }
            game.offsetLeft += deltaX;
        } else {

            return true;
        }
        if (game.offsetLeft < game.minOffset) {
            game.offsetLeft = game.minOffset;
            return true;
        } else if (game.offsetLeft > game.maxOffset) {
            game.offsetLeft = game.maxOffset;
            return true;
        }
        return false;
    },
    countHeroesAndVillains: function () {
        game.heroes = [];
        game.villains = [];
        for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
            var entity = body.GetUserData();
            if (entity) {
                if (entity.type === "hero") {
                    game.heroes.push(body);
                } else if (entity.type === "villain") {
                    game.villains.push(body);
                }
            }
        }
    },
    mouseOnCurrentHero: function () {
        if (!game.currentHero) {
            return false;
        }
        var position = game.currentHero.GetPosition();
        var distanceSquared = Math.pow(position.x * box2d.scale - mouse.x - game.offsetLeft, 2) + Math.pow(position.y * box2d.scale - mouse.y, 2);
        var radiusSquared = Math.pow(game.currentHero.GetUserData().radius, 2);
        return (distanceSquared <= radiusSquared);
    },
    handlePanning: function () {
        //game.offsetLeft++;//marcador de posicion temporal, mantiene la panoramica a la derecha
        if (game.mode === "intro") {
            if (game.panTo(700)) {
                game.mode = "load-next-hero";
            }
        }
        if (game.mode === "wait-for-firing") {
            if (mouse.dragging) {
                if (game.mouseOnCurrentHero()) {
                    game.mode = "firing";
                } else {
                    game.panTo(mouse.x + game.offsetLeft)
                }
            } else {
                game.panTo(game.slingshotX);
            }
        }

        if (game.mode === "firing") {
            if (mouse.down) {
                game.panTo(game.slingshotX);
                game.currentHero.SetPosition({x: (mouse.x + game.offsetLeft) / box2d.scale, y: mouse.y / box2d.scale});
            } else {
                game.mode = "fired";
                if (!game.noSound) {
                    game.slingshotReleasedSound.play();
                }
                var impulseScaleFactor = 0.75;

                // Coordenadas del centro de la honda (donde la banda está atada a la honda)
                var slingshotCenterX = game.slingshotX + 35;
                var slingshotCenterY = game.slingshotY + 25;
                var impulse = new b2Vec2((slingshotCenterX - mouse.x - game.offsetLeft) * impulseScaleFactor, (slingshotCenterY - mouse.y) * impulseScaleFactor);
                game.currentHero.ApplyImpulse(impulse, game.currentHero.GetWorldCenter());

            }
        }

        if (game.mode === "fired") {
            //Vista panoramica donde el heroe se encuentra actualmente...
            var heroX = game.currentHero.GetPosition().x * box2d.scale;
            game.panTo(heroX);
            //Y esperar hasta que deja de moverse, está fuera de los límites o se mueve lentamente durante demasiado tiempo
            if (game.currentHero.m_linearVelocity.x < 2 && game.currentHero.m_xf.position.y > 13) {
                game.decelerating++;
            } else {
                game.decelerating = 0;
            }
            //var position = game.currentHero.GetPosition();

            //Y esperar hasta que deja de moverse o esta fuera de los limites
            if (!game.currentHero.IsAwake() || heroX < 0 || heroX > game.currentLevel.foregroundImage.width || game.decelerating > 350) {
                // Luego borra el viejo heroe
                box2d.world.DestroyBody(game.currentHero);
                game.currentHero = undefined;
                // Resetea el numero de veces que se desplaza lentamente
                game.decelerating = 0;
                // y carga el siguiente heroe
                game.mode = "load-next-hero"
            }
        }

        if (game.mode === "load-next-hero") {
            game.countHeroesAndVillains();

            // Comprobar si algun villano está¡ vivo, si no, termine el nivel (exito)
            if (game.villains.length === 0) {
                game.mode = "level-success";
                return;
            }

            // Comprobar si hay mas heroes para cargar, si no terminar el nivel (fallo)
            if (game.heroes.length === 0) {
                game.mode = "level-failure"
                return;
            }

            // Cargar el heroe y establecer el modo de espera para disparar (wait-for-firing)
            if (!game.currentHero) {
                game.currentHero = game.heroes[game.heroes.length - 1];
                game.currentHero.SetPosition({x: 180 / box2d.scale, y: 200 / box2d.scale});
                game.currentHero.SetLinearVelocity({x: 0, y: 0});
                game.currentHero.SetAngularVelocity(0);
                game.currentHero.SetAwake(true);
            } else {
                // Esperar a que el heroe deje de rebotar y se duerma y luego cambie a espera para disparar (wait-for-firing)
                game.panTo(game.slingshotX);
                if (!game.currentHero.IsAwake()) {
                    game.mode = "wait-for-firing";
                }
            }
        }


        if (game.mode === "level-success" || game.mode === "level-failure") {
            if (game.panTo(0)) {
                game.ended = true;
                game.showEndingScreen();
            }
        }
    },
    showEndingScreen: function () {
        $('#playnextlevel').html('');
        $('#endingmessage').html('');
        $('#playcurrentlevel').html('');
        //game.stopBackgroundMusic();
        if (game.mode === "level-success") {
            var aux = game.currentLevel.number + 1;
            if (aux > blockedLevel) {
                blockedLevel++;
            }
            if (game.currentLevel.number < levels.data.length - 1) {
                $('#endingmessage').html(getLit('LIT_level_complete', loader.language));
                $('#playnextlevel').html('<td><img src="assets/images/next.png" onclick="game.nextLevel();"></td><td>' + getLit('LIT_play_next_level', loader.language) + '</td>');

            } else {
                $('#endingmessage').html(getLit('LIT_no_more_levels', loader.language));
            }

        } else if (game.mode === "level-failure") {
            $('#endingmessage').html(getLit('LIT_fail_level', loader.language));
            $('#playcurrentlevel').html('<td><img src="assets/images/retry.png" onclick="game.restartLevel();"></td><td>' + getLit('LIT_replay_level', loader.language) + '</td>');
        }

        $('#returntolevelscreen').html('<td><img src="assets/images/home.png" onclick="game.showLevelScreen();"></td><td>' + getLit('LIT_return_level_screen', loader.language) + '</td>');
        $('#endingscreen').show();
        $('#gamecanvas').addClass('blurBackground');
    },
    animate: function () {
        //animar el fondo
        game.handlePanning();
        //animar los personajes
        var currentTime = new Date().getTime();
        var timeStep;
        if (game.lastUpdateTime) {
            timeStep = (currentTime - game.lastUpdateTime) / 1000;
            if (timeStep > 2 / 60) {
                timeStep = 2 / 60
            }
            box2d.step(timeStep);
        }
        game.lastUpdateTime = currentTime;
        //dibujar el fondo con desplazamiento
        game.context.drawImage(game.currentLevel.backgroundImage, game.offsetLeft / 2, 0, 640, 480, 0, 0, 640, 480);// /4
        game.context.drawImage(game.currentLevel.foregroundImage, game.offsetLeft, 0, 640, 480, 0, 0, 640, 480);
        // Dibujar la honda
        game.context.drawImage(game.slingshotImage, game.slingshotX - game.offsetLeft, game.slingshotY);
        // Dibujar todos los cuerpos
        game.drawAllBodies();
        // Dibujar la banda cuando estamos disparando un heroe
        if (game.mode === "wait-for-firing" || game.mode === "firing") {
            game.drawSlingshotBand();
        }
        //dibujar el frente del tirachinas
        game.context.drawImage(game.slingshotFrontImage, game.slingshotX - game.offsetLeft, game.slingshotY);
        if (!game.ended) {
            game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
        }
    },
    drawAllBodies: function () {
        box2d.world.DrawDebugData();

        // Iterar a traves de todos los cuerpos y dibujarlos en el lienzo del juego
        for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
            var entity = body.GetUserData();

            if (entity) {
                var entityX = body.GetPosition().x * box2d.scale;
                if (entityX < 0 || entityX > game.currentLevel.foregroundImage.width || (entity.health && entity.health < 0)) {
                    box2d.world.DestroyBody(body);
                    if (entity.type === "villain") {
                        game.score += entity.calories;
                        $('#score').html(getLit('LIT_score', loader.language) + game.score);
                    }
                    if (!game.noSound) {
                        if (entity.breakSound) {
                            entity.breakSound.play();
                        }
                    }
                } else {
                    entities.draw(entity, body.GetPosition(), body.GetAngle())
                }
            }
        }
    },
    drawSlingshotBand: function () {
        game.context.strokeStyle = "rgb(68,31,11)"; // Color marron oscuro
        game.context.lineWidth = 6; // Dibuja una linea gruesa

        // Utilizar el angulo y el radio del heroe para calcular el centro del heroe
        var radius = game.currentHero.GetUserData().radius;
        var heroX = game.currentHero.GetPosition().x * box2d.scale;
        var heroY = game.currentHero.GetPosition().y * box2d.scale;
        var angle = Math.atan2(game.slingshotY + 25 - heroY, game.slingshotX + 50 - heroX);

        var heroFarEdgeX = heroX - radius * Math.cos(angle);
        var heroFarEdgeY = heroY - radius * Math.sin(angle);


        game.context.beginPath();
        // Iniciar la linea desde la parte superior de la honda (la parte trasera)
        game.context.moveTo(game.slingshotX + 50 - game.offsetLeft, game.slingshotY + 25);

        // Dibuja linea al centro del heroe
        game.context.lineTo(heroX - game.offsetLeft, heroY);
        game.context.stroke();

        // Dibuja el heroe en la banda posterior
        entities.draw(game.currentHero.GetUserData(), game.currentHero.GetPosition(), game.currentHero.GetAngle());

        game.context.beginPath();
        // Mover al borde del heroe mas alejado de la parte superior de la honda
        game.context.moveTo(heroFarEdgeX - game.offsetLeft, heroFarEdgeY);

        // Dibujar linea de regreso a la parte superior de la honda (el lado frontal)
        game.context.lineTo(game.slingshotX - game.offsetLeft + 10, game.slingshotY + 30)
        game.context.stroke();
    },

}
var levels = {
    // Datos de nivel
    data: [
        {// Primer nivel
            foreground: 'N1-foreground',
            background: 'N1-background',
            icon: 'N1-icon',
            icondisable: 'N1-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "espiral", x: 520, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 620, y: 280, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 520, y: 280, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "pelota", x: 400, y: 410, angle: 90, width: 50, height: 50},

                {type: "villain", name: "villano", x: 520, y: 205, calories: 590},
                {type: "villain", name: "villano", x: 620, y: 205, calories: 420},

                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ]
        },
        {// Segundo nivel
            foreground: 'N2-foreground',
            background: 'N2-background',
            icon: 'N2-icon',
            icondisable: 'N2-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 317.5, width: 100, height: 25},
                {type: "block", name: "espiral", x: 770, y: 317.5, width: 100, height: 25},

                {type: "block", name: "espiral", x: 670, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 770, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 192.5, width: 100, height: 25},

                {type: "villain", name: "villano", x: 715, y: 155, calories: 590},
                {type: "villain", name: "villano", x: 670, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 765, y: 400, calories: 150},

                {type: "hero", name: "ciruela", x: 30, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ]
        },
        {//Tercer nivel
            foreground: 'N3-foreground',
            background: 'N3-background',
            icon: 'N3-icon',
            icondisable: 'N3-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 317.5, width: 100, height: 25},
                {type: "block", name: "espiral", x: 770, y: 317.5, width: 100, height: 25},

                {type: "block", name: "bloque", x: 820, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 192.5, width: 100, height: 25},
                {type: "block", name: "espiral", x: 770, y: 192.5, width: 110, height: 25},

                {type: "villain", name: "villano", x: 715, y: 155, calories: 590},
                {type: "villain", name: "villano", x: 670, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 765, y: 400, calories: 150},

                {type: "hero", name: "ciruela", x: 30, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ]
        },
        {//Cuarto nivel
            foreground: 'N4-foreground',
            background: 'N4-background',
            icon: 'N4-icon',
            icondisable: 'N4-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "bloque", x: 550, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 550, y: 317.5, width: 100, height: 25},
                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 317.5, width: 100, height: 25},
                {type: "block", name: "espiral", x: 770, y: 317.5, width: 100, height: 25},
                {type: "block", name: "bloque", x: 820, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 720, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "pelota", x: 400, y: 410, angle: 90, width: 50, height: 50},
                {type: "block", name: "bloque", x: 620, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 192.5, width: 110, height: 25},
                {type: "block", name: "espiral", x: 770, y: 192.5, width: 110, height: 25},

                {type: "villain", name: "villano", x: 550, y: 255, calories: 590},
                {type: "villain", name: "villano", x: 670, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 765, y: 255, calories: 150},
                {type: "villain", name: "villano", x: 765, y: 155, calories: 150},
                {type: "villain", name: "villano", x: 765, y: 400, calories: 150},

                {type: "hero", name: "ciruela", x: 30, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ],
        },
        {//Quinto nivel
            foreground: 'N5-foreground',
            background: 'N5-background',
            icon: 'N5-icon',
            icondisable: 'N5-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 35},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 320.5, width: 110, height: 25},
                {type: "block", name: "espiral", x: 770, y: 320.5, width: 110, height: 25},
                {type: "block", name: "bloque", x: 720, y: 255, angle: 90, width: 120, height: 45},
                {type: "block", name: "bloque", x: 820, y: 255, angle: 90, width: 120, height: 25},
                {type: "block", name: "espiral", x: 770, y: 180, width: 130, height: 20},
                {type: "block", name: "bloque", x: 870, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 170, angle: 90, width: 50, height: 25},
                {type: "block", name: "bloque", x: 870, y: 317.5, width: 100, height: 25},

                {type: "villain", name: "villano", x: 780, y: 270, calories: 590},
                {type: "villain", name: "villano", x: 665, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 780, y: 170, calories: 420},
                {type: "villain", name: "villano", x: 870, y: 150, calories: 150},
                {type: "villain", name: "villano", x: 765, y: 405, calories: 150},
                {type: "villain", name: "villano", x: 900, y: 405, calories: 590},

                {type: "hero", name: "ciruela", x: 30, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},

            ],
        },
        {//Sexto nivel
            foreground: 'N6-foreground',
            background: 'N6-background',
            icon: 'N6-icon',
            icondisable: 'N6-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 35},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 320.5, width: 110, height: 25},
                {type: "block", name: "espiral", x: 770, y: 320.5, width: 110, height: 25},
                {type: "block", name: "pelota", x: 400, y: 410, angle: 90, width: 50, height: 50},
                {type: "block", name: "bloque", x: 655, y: 255, angle: -45, width: 130, height: 15},
                {type: "block", name: "bloque", x: 720, y: 255, angle: 90, width: 120, height: 45},
                {type: "block", name: "bloque", x: 820, y: 255, angle: 90, width: 120, height: 25},
                {type: "block", name: "espiral", x: 770, y: 180, width: 130, height: 20},
                {type: "block", name: "bloque", x: 870, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 170, angle: 90, width: 50, height: 25},
                {type: "block", name: "bloque", x: 870, y: 317.5, width: 100, height: 25},

                {type: "villain", name: "villano", x: 780, y: 270, calories: 590},
                {type: "villain", name: "villano", x: 665, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 780, y: 170, calories: 420},
                {type: "villain", name: "villano", x: 870, y: 150, calories: 150},
                {type: "villain", name: "villano", x: 765, y: 405, calories: 150},
                {type: "villain", name: "villano", x: 900, y: 405, calories: 590},
                {type: "villain", name: "villano", x: 580, y: 410, calories: 200},
                {type: "villain", name: "villano", x: 900, y: 290, calories: 200},

                {type: "hero", name: "ciruela", x: 30, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ],
        },
        {//Septimo nivel
            foreground: 'N7-foreground',
            background: 'N7-background',
            icon: 'N7-icon',
            icondisable: 'N7-icon-disable',
            entities: [
                {type: "ground", name: "suelo", x: 500, y: 440, width: 1000, height: 20, isStatic: true},
                {type: "ground", name: "suelo", x: 185, y: 390, width: 30, height: 80, isStatic: true},

                {type: "block", name: "espiral", x: 900, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 550, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 550, y: 317.5, width: 100, height: 25},
                {type: "block", name: "bloque", x: 545, y: 260, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 545, y: 240.5, width: 100, height: 25},
                {type: "block", name: "bloque", x: 820, y: 380, angle: 90, width: 100, height: 35},
                {type: "block", name: "bloque", x: 720, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 620, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "espiral", x: 670, y: 320.5, width: 110, height: 25},
                {type: "block", name: "espiral", x: 770, y: 320.5, width: 110, height: 25},
                {type: "block", name: "pelota", x: 400, y: 410, angle: 90, width: 50, height: 50},
                {type: "block", name: "bloque", x: 655, y: 255, angle: -45, width: 130, height: 15},
                {type: "block", name: "bloque", x: 720, y: 255, angle: 90, width: 120, height: 45},
                {type: "block", name: "bloque", x: 820, y: 255, angle: 90, width: 120, height: 25},
                {type: "block", name: "espiral", x: 770, y: 180, width: 130, height: 20},
                {type: "block", name: "bloque", x: 870, y: 380, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 255, angle: 90, width: 100, height: 25},
                {type: "block", name: "bloque", x: 870, y: 170, angle: 90, width: 50, height: 25},
                {type: "block", name: "bloque", x: 870, y: 317.5, width: 100, height: 25},

                {type: "villain", name: "villano", x: 500, y: 410, calories: 350},
                {type: "villain", name: "villano", x: 780, y: 270, calories: 590},
                {type: "villain", name: "villano", x: 665, y: 405, calories: 420},
                {type: "villain", name: "villano", x: 780, y: 170, calories: 420},
                {type: "villain", name: "villano", x: 870, y: 150, calories: 150},
                {type: "villain", name: "villano", x: 765, y: 405, calories: 150},
                {type: "villain", name: "villano", x: 900, y: 405, calories: 590},
                {type: "villain", name: "villano", x: 580, y: 290, calories: 200},
                {type: "villain", name: "villano", x: 900, y: 290, calories: 200},

                {type: "hero", name: "ciruela", x: 5, y: 415},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "melocoton", x: 80, y: 405},
                {type: "hero", name: "manzana", x: 140, y: 405},
            ],
        }
    ],
    //inicializa la pantalla de seleccion de nivel
    init: function () {
        var html = "";
        var maxLine = Math.round(levels.data.length / 2);
        var cont = 0;
        var i = 0;

        html += '<div><h1>' + getLit('LIT_select_nivel', loader.language) + '</h1></div>';
        while (i < levels.data.length) {
            html += '<div>';
            while ((cont < maxLine) && (i < levels.data.length)) {
                var level = levels.data[i];
                if (i <= blockedLevel) {
                    html += '<input type="button" value="' + (i + 1) + '" style="background:url(assets/levels/' + level.icon + '.png)no-repeat; background-size: contain;" class="levelactive">';
                } else {
                    html += '<input type="button" value="' + (i + 1) + '" style="background:url(assets/levels/' + level.icondisable + '.png)no-repeat; background-size: contain;" class="leveldisabled" disabled>';
                }
                cont++;
                i++;
            }
            html += '</div>';
            cont = 0;
        }
        $('#levelselectscreen').html(html);

        //establece los controladores de eventos de clic de boton para cargar el nivel
        $('#levelselectscreen input').click(function () {
            levels.load(this.value - 1);
            $('#levelselectscreen').hide();
        });
    },
    //carga todos los datos e imagenes para un nivel
    load: function (number) {
        //Inicializar box2d world cada vez que se carga un nivel
        box2d.init();

        // Declarar un nuevo objeto de nivel actual
        game.currentLevel = {number: number, hero: []};
        game.score = 0;
        $('#score').html(getLit('LIT_score', loader.language) + game.score);
        game.currentHero = undefined;
        var level = levels.data[number];


        //Cargar las imagenes de fondo, primer plano y honda
        game.currentLevel.backgroundImage = loader.loadImage("assets/levels/" + level.background + ".png");
        game.currentLevel.foregroundImage = loader.loadImage("assets/levels/" + level.foreground + ".png");
        game.slingshotImage = loader.loadImage("assets/images/tirachinas.png");
        game.slingshotFrontImage = loader.loadImage("assets/images/tirachinas-front.png");

        // Cargar todas la entidades
        for (var i = level.entities.length - 1; i >= 0; i--) {
            var entity = level.entities[i];
            entities.create(entity);
        }

        //Llamar a game.start() una vez que los assets se hayan cargado
        if (loader.loaded) {
            game.start()
        } else {
            loader.onload = game.start;
        }
    }
}

var entities = {
    definitions: {
        "suelo": {
            density: 3.0,
            friction: 1.5,
            restitution: 0.2,
        },
        "espiral": {
            shape: "rectangle",
            fullHealth: 100,
            density: 0.7,
            friction: 0.4,
            restitution: 0.15,
        },
        "bloque": {
            shape: "rectangle",
            fullHealth: 500,
            density: 2.4,
            friction: 0.4,
            restitution: 0.4,
        },
        "pelota": {
            shape: "circle",
            radius: 25,
            fullHealth: 10000000,//inmortal
            density: 0.1,//peso
            friction: 0.5,//asegurar escurre realista
            restitution: 1,//rebotar mucho
        },
        "villano": {
            shape: "rectangle",
            fullHealth: 50,
            width: 40,
            height: 50,
            density: 1,
            friction: 0.5,
            restitution: 0.6,
        },
        "manzana": { //hero
            shape: "circle",
            radius: 25,
            density: 3.0,
            friction: 0.5,
            restitution: 0.1,
        },
        "melocoton": { //hero
            shape: "circle",
            radius: 25,
            density: 2.0,
            friction: 0.5,
            restitution: 0.5,
        },
        "ciruela": { //hero
            shape: "circle",
            radius: 15,
            density: 1.0,
            friction: 0.5,
            restitution: 0.9,
        },
    },
    // Tomar la entidad, crear un cuerpo box2d y añadirlo al mundo
    create: function (entity) {
        var definition = entities.definitions[entity.name];
        if (!definition) {
            console.log("Undefined entity name", entity.name);
            return;
        }
        switch (entity.type) {
            case "block": // Rectángulos simples
                entity.health = definition.fullHealth;
                entity.fullHealth = definition.fullHealth;
                entity.sprite = loader.loadImage("assets/estructuras/" + entity.name + "-" + Math.round(Math.random() * (4 - 1) + 1) + ".png");
                entity.shape = definition.shape;
                if (definition.shape === "circle") {
                    entity.radius = definition.radius;
                    box2d.createCircle(entity, definition);
                } else if (definition.shape === "rectangle") {
                    box2d.createRectangle(entity, definition);
                }
                entity.breakSound = game.breakSound[entity.name];
                break;
            case "ground": // Rectángulos simples
                // No hay necesidad de salud. Estos son indestructibles
                entity.shape = "rectangle";
                // No hay necesidad de sprites. Éstos no serán dibujados en absoluto
                box2d.createRectangle(entity, definition);
                break;
            case "hero": // Círculos simples
                var name = entity.name;
                if (entity.name === "ciruela") {
                    name = entity.name + "-" + Math.round(Math.random() * (2 - 1) + 1);
                }
                entity.sprite = loader.loadImage("assets/entities/" + name + ".png");
                entity.shape = definition.shape;
                entity.bounceSound = game.bounceSound;
                if (definition.shape === "circle") {
                    entity.radius = definition.radius;
                    box2d.createCircle(entity, definition);
                }
                break;
            case "villain": // Pueden ser círculos o rectángulos
                entity.health = definition.fullHealth;
                entity.fullHealth = definition.fullHealth;
                entity.sprite = loader.loadImage("assets/entities/" + entity.name + "-" + Math.round(Math.random() * (15 - 1) + 1) + ".png");
                entity.shape = definition.shape;
                entity.bounceSound = game.bouncehitSound;
                if (definition.shape === "circle") {
                    entity.radius = definition.radius;
                    box2d.createCircle(entity, definition);
                } else if (definition.shape === "rectangle") {
                    entity.width = definition.width;
                    entity.height = definition.height;
                    box2d.createRectangle(entity, definition);
                }
                break;
            default:
                console.log("Undefined entity type", entity.type);
                break;
        }
    },
    // Tomar la entidad, su posicion y angulo y dibujar en el lienzo de juego
    draw: function (entity, position, angle) {
        game.context.translate(position.x * box2d.scale - game.offsetLeft, position.y * box2d.scale);
        game.context.rotate(angle);
        switch (entity.type) {
            case "block":
                game.context.drawImage(entity.sprite, 0, 0, entity.sprite.width, entity.sprite.height,
                    -entity.width / 2 - 1, -entity.height / 2 - 1, entity.width + 2, entity.height + 2);
                break;
            case "villain":
            case "hero":
                if (entity.shape === "circle") {
                    game.context.drawImage(entity.sprite, 0, 0, entity.sprite.width, entity.sprite.height,
                        -entity.radius - 1, -entity.radius - 1, entity.radius * 2 + 2, entity.radius * 2 + 2);
                } else if (entity.shape === "rectangle") {
                    game.context.drawImage(entity.sprite, 0, 0, entity.sprite.width, entity.sprite.height,
                        -entity.width / 2 - 1, -entity.height / 2 - 1, entity.width + 2, entity.height + 2);
                }
                break;
            case "ground":
                // No hacer nada ... Vamos a dibujar objetos como el suelo y la honda por separado
                break;
        }

        game.context.rotate(-angle);
        game.context.translate(-position.x * box2d.scale + game.offsetLeft, -position.y * box2d.scale);
    }

}
var box2d = {
    scale: 30,
    init: function () {
        // Configurar el mundo de box2d que hara la mayoria de los circulos de la fisica
        var gravity = new b2Vec2(0, 9.8); //Declara la gravedad como 9,8 m / s ^ 2 hacia abajo
        var allowSleep = true; //Permita que los objetos que estan en reposo se queden dormidos y se excluyan de los calculos
        box2d.world = new b2World(gravity, allowSleep);

        // Configurar depuracion de dibujo
        var debugContext = document.getElementById('debugcanvas').getContext('2d');
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(debugContext);
        debugDraw.SetDrawScale(box2d.scale);
        debugDraw.SetFillAlpha(0.3);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        box2d.world.SetDebugDraw(debugDraw);

        var listener = new Box2D.Dynamics.b2ContactListener;
        listener.PostSolve = function (contact, impulse) {
            var body1 = contact.GetFixtureA().GetBody();
            var body2 = contact.GetFixtureB().GetBody();
            var entity1 = body1.GetUserData();
            var entity2 = body2.GetUserData();

            var impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
            // Este listener es llamado con mucha frecuencia. Filtra los impulsos muy prqueños.
            // Despues de probar diferentes valores, 5 parece funcionar bien
            if (impulseAlongNormal > 5) {
                // Si los objetos tienen una salud, reduzca la salud por el valor del impulso
                if (entity1.health) {
                    entity1.health -= impulseAlongNormal;
                }

                if (entity2.health) {
                    entity2.health -= impulseAlongNormal;
                }
                if (!game.noSound) {
                    // Si los objetos tienen un sonido de rebote, reproducirlos
                    if (entity1.bounceSound) {
                        entity1.bounceSound.play();
                    }

                    if (entity2.bounceSound) {
                        entity2.bounceSound.play();
                    }
                }
            }
        };
        box2d.world.SetContactListener(listener);
    },
    step: function (timeStep) {
        // velocidad de las iteraciones = 8
        // posición de las iteraciones = 3
        box2d.world.Step(timeStep, 8, 3);
    },
    createRectangle: function (entity, definition) {
        var bodyDef = new b2BodyDef;
        if (entity.isStatic) {
            bodyDef.type = b2Body.b2_staticBody;
        } else {
            bodyDef.type = b2Body.b2_dynamicBody;
        }

        bodyDef.position.x = entity.x / box2d.scale;
        bodyDef.position.y = entity.y / box2d.scale;
        if (entity.angle) {
            bodyDef.angle = Math.PI * entity.angle / 180;
        }

        var fixtureDef = new b2FixtureDef;
        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;

        fixtureDef.shape = new b2PolygonShape;
        fixtureDef.shape.SetAsBox(entity.width / 2 / box2d.scale, entity.height / 2 / box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);

        var fixture = body.CreateFixture(fixtureDef);
        return body;
    },

    createCircle: function (entity, definition) {
        var bodyDef = new b2BodyDef;
        if (entity.isStatic) {
            bodyDef.type = b2Body.b2_staticBody;
        } else {
            bodyDef.type = b2Body.b2_dynamicBody;
        }

        bodyDef.position.x = entity.x / box2d.scale;
        bodyDef.position.y = entity.y / box2d.scale;

        if (entity.angle) {
            bodyDef.angle = Math.PI * entity.angle / 180;
        }
        var fixtureDef = new b2FixtureDef;
        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;

        fixtureDef.shape = new b2CircleShape(entity.radius / box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);

        var fixture = body.CreateFixture(fixtureDef);
        return body;
    },
}


var loader = {
    loaded: true,
    loadedCount: 0,//assets que han sido cargados antes
    totalCount: 0,//numero total de assets que es necesario cargar
    language: 'esp',//bandera de idioma

    init: function () {
        //comprueba el soporte para sonido
        var mp3Support, oggSupport;
        var audio = document.createElement('audio');

        if (audio.canPlayType) {
            //actualmente canPlayType devuelve: "","mayby" o "probably"
            mp3Support = "" != audio.canPlayType('audio/mpeg');
            oggSupport = "" != audio.canPlayType('audio/ogg; codecs="vorbis"');
        } else {
            //la etiqueta de audio no es soportada
            mp3Support = false;
            oggSupport = false;
        }
        //comprueba para ogg, mp3 y finalmente fija soundFileExtn como undefined
        loader.soundFileExtn = oggSupport ? ".ogg" : mp3Support ? ".mp3" : undefined;
        loader.changeIndexLanguage(loader.language);
    },
    changeIndexLanguage() {
        $('#language').attr('src', getLit('LIT_img_language', loader.language));
        $('#playGameBut').text(getLit('LIT_play_game', loader.language));
        $('#settingBut').text(getLit('LIT_open_settings', loader.language));
    },
    loadImage: function (url) {
        this.totalCount++;
        this.loaded = false;
        $('#loadingscreen').show();
        var image = new Image();
        image.src = url;
        image.onload = loader.itemLoaded;
        return image;
    },
    soundFileExtn: ".ogg",
    loadSound: function (url) {
        this.totalCount++;
        this.loaded = false;
        $('#loadingscreen').show();
        var audio = new Audio();
        audio.src = url + loader.soundFileExtn;
        audio.addEventListener("canplaythrough", loader.itemLoaded, false);
        return audio;
    },
    itemLoaded: function () {
        loader.loadedCount++;
        $('#loadingmessage').html(getLit('LIT_loaded_media_1', loader.language) + loader.loadedCount + getLit('LIT_loaded_media_2', loader.language) + loader.totalCount);
        if (loader.loadedCount === loader.totalCount) {
            //el loader ha cargado completamente
            loader.loaded = true;
            $('#loadingscreen').hide();
            if (loader.onload) {
                loader.onload();
                loader.onload = undefined;
            }
        }
    }
}

var mouse = {
    x: 0,
    y: 0,
    down: false,
    init: function () {
        $('#gamecanvas').mousemove(mouse.mousemovehandler);
        $('#gamecanvas').mousedown(mouse.mousedownhandler);
        $('#gamecanvas').mouseup(mouse.mouseuphandler);
        $('#gamecanvas').mouseout(mouse.mouseuphandler);
    },
    mousemovehandler: function (ev) {
        var offset = $('#gamecanvas').offset();

        mouse.x = ev.pageX - offset.left;
        mouse.y = ev.pageY - offset.top;

        if (mouse.down) {
            mouse.dragging = true;
        }
    },
    mousedownhandler: function (ev) {
        mouse.down = true;
        mouse.downX = mouse.x;
        mouse.downY = mouse.y;
        ev.originalEvent.preventDefault();
    },
    mouseuphandler: function (ev) {
        mouse.down = false;
        mouse.dragging = false;
    }
}

var setting = {
    language: '',
    changeSettingsLanguage(language) {
        if (language === 'esp') {
            $("#selectLanguage").find("option[value='esp']").attr('selected', 'selected');
            setting.language = 'esp';
        }
        if (language === 'eeuu') {
            $("#selectLanguage").find("option[value='eeuu']").attr('selected', 'selected');
            setting.language = 'eeuu';
        }
        $('#settingsmessage').text(getLit('LIT_settings', loader.language));
        $('#saveSettings').text(getLit('LIT_settings_save', loader.language));
        $('#textSelectLanguage').text(getLit('LIT_settings_language', loader.language));
        $('#languageSettings').attr('src', getLit('LIT_img_language', loader.language));
    },
    showSettingScreen: function () {
        game.clickSound.play();
        $('.gamelayer').hide();
        $('#settingscreen').show();
        language = loader.language;
        $('#selectLanguage').empty();
        $("#selectLanguage").prepend("<option value='esp'>Español</option>");
        $("#selectLanguage").prepend("<option value='eeuu'>English</option>");
        setting.changeSettingsLanguage(language);
        $("#selectLanguage").change(function () {
            option = $(this).val();
            setting.changeSettingsLanguage(option);
        });
    },
    saveSetting: function () {
        game.clickSound.play();
        loader.language = setting.language;
        loader.changeIndexLanguage(setting.language);
        $('#settingscreen').hide();
        $('#gamestartscreen').show();
    },
}