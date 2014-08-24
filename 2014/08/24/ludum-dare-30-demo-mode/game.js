var tiles = new Tiles();
var controls = new Controls();

var frames = 0;
var MS_PER_GAME = 60 * 1000;
var startTime = new Date().getTime();

var demoRunning = false;
var running = false;
var scoring = false;

$(function() {
  controls.init();
  $('table[data-player]').hide();
});

function tick() {
  frames += 1;

  var soFar = new Date().getTime() - startTime;
  var remainingSec = Math.floor((MS_PER_GAME - soFar) / 1000);

  if (running && remainingSec > 0) {

    $('#countdown')
      .css('top', '')
      .css('left', '')
      .css('bottom', '10px')
      .css('right', '10px')
      .text(remainingSec + ' sec remaining');

    $('#debug').text(
      frames + ' frames in ' +
      soFar + ' seconds, ' +
      (frames / Math.floor(soFar / 1000)) + ' fps'
    );

    tiles.tick(scoring);
    controls.tick();

  } else if (scoring) {

    scoring = tiles.tick(scoring);
    if (!scoring) {
      $('a[data-button]').fadeIn();

      winner = tiles.getWinner();
      $('#countdown')
        .css('top', '130px')
        .css('left', '220px')
        .css('bottom', '')
        .css('right', '')
        .text('game over, player ' + (winner + 1) + ' wins!');
    }

  } else if (demoRunning) {

    tiles.tick(scoring);
    controls.tick();

  } else {

    stop();

  }

  if (demoRunning || running || scoring) {
    setTimeout(tick, 1000/60);
  }
}

function run() {
  $('a[data-button]').fadeOut();
  $('table[data-player]').fadeOut();

  $('canvas')
    .hide()
    .fadeIn();

  if (demoRunning) {
    controls.stop();
    tiles.stop();
    demoRunning = false;
  }

  controls.init();
  tiles.init();

  frames = 0;
  startTime = new Date().getTime();
  running = true;
  scoring = false;

  tick();

  return false;
}

function stop() {
  controls.stop();
  tiles.stop();

  $('canvas')
    .hide()
    .fadeIn();

  startTime = new Date().getTime() - MS_PER_GAME;
  running = false;
  scoring = true;
  $('#countdown')
    .hide()
    .fadeIn()
    .css('top', '130px')
    .css('left', '220px')
    .css('bottom', '')
    .css('right', '')
    .text('game over');

  return false;
}

$(function() {
  $('[data-button="run"]').click(run);
  $('[data-button="options"]').click(function() {
    $('[data-button="options"]');
    $('table[data-player]').fadeToggle();
  });

  demoRunning = true;
  controls.init();
  tiles.init();
  tick();
});
