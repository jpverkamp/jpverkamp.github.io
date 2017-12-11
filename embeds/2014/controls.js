function Controls() {
  var keys = {};
  var ais = {};

  var running = false;
  var PER_TICK_ACCELERATION = 0.25; // pixels/tick^2
  var PER_TICK_FRICTION = 0.001;    // pixels/tick^2
  var VELOCITY_CAP = 10;            // pixels/tick

  var vel = {};

  // Load key bindings
  var loadKeyBindings = function() {
    keys = {};

    $('#controls table').each(function(i, eli) {
      var player = parseInt($(eli).attr('data-player'));

      $(eli).find('input').each(function(j, elj) {
        var command = $(elj).attr('name');
        var key = $(elj).val();

        keys[key] = [player, command, false];
      });
    });
  };

  // Load the player types
  var loadPlayerTypes = function() {
    ais = {};

    $('#controls table').each(function(i, eli) {
      var player = parseInt($(eli).attr('data-player'));
      var type = $(eli).find('select[name="type"]').val();

      if (type == 'disabled') {
        $('canvas[data-player="' + player + '"]')
          .attr('data-disabled', 'true')
          .hide()
          .css('left', '-1000px');
      } else {
        $('canvas[data-player="' + player + '"]')
          .attr('data-disabled', 'false');
      }

      if (type.substring(0, 2) == "ai") {
        ais[player] = {'type': type.substring(3)};
      }
    });
  };

  var onkey = function(event) {
    switch (event.keyCode) {
      case  37: key = 'LEFT'; break;
      case  38: key = 'UP'; break;
      case  39: key = 'RIGHT'; break;
      case  40: key = 'DOWN'; break;
      case  97: key = 'NUM1'; break;
      case  98: key = 'NUM2'; break;
      case  99: key = 'NUM3'; break;
      case 100: key = 'NUM4'; break;
      case 101: key = 'NUM5'; break;
      case 102: key = 'NUM6'; break;
      case 103: key = 'NUM7'; break;
      case 104: key = 'NUM8'; break;
      case 105: key = 'NUM9'; break;
      default: key = String.fromCharCode(event.keyCode).toUpperCase();
    }

    if (key in keys) {
      if (event.type == 'keydown') {
        keys[key][2] = true;
      } else if (event.type == 'keyup') {
        keys[key][2] = false;
      }
    }
  };

  this.tick = function() {
    $.each(keys, function(_, key) {
      var player = key[0];
      var command = key[1];
      var active = key[2];

      // Don't move players that don't exist
      if (player >= vel.length) return;

      // Update velocity
      if (active && !(player in ais)) {
        if (command == 'up') {
          vel[player][1] -= PER_TICK_ACCELERATION;
        } else if (command == 'down') {
          vel[player][1] += PER_TICK_ACCELERATION;
        } else if (command == 'left') {
          vel[player][0] -= PER_TICK_ACCELERATION;
        } else if (command == 'right') {
          vel[player][0] += PER_TICK_ACCELERATION;
        }
      }
    });

    // Run AIs
    $.each(ais, function(player, ai) {
      switch (ai['type']) {
        // Randomly wiggle about, changing directions no slower than every second
        case 'wiggle':
          ai['nextWiggle'] = ai['nextWiggle'] || new Date().getTime() + 1000 * Math.random();
          ai['xAccel'] = ai['xAccel'] || 0;
          ai['yAccel'] = ai['yAccel'] || 0;

          if (new Date().getTime() > ai['nextWiggle']) {
            ai['xAccel'] = (Math.floor(Math.random() * 3) - 1) * PER_TICK_ACCELERATION;
            ai['yAccel'] = (Math.floor(Math.random() * 3) - 1) * PER_TICK_ACCELERATION;

            ai['nextWiggle'] = new Date().getTime() + 1000 * Math.random();
          }

          vel[player][0] += ai['xAccel'];
          vel[player][1] += ai['yAccel'];

          break;

        case 'chicken': // Run away from the nearest other tile
        case 'shark':   // Run towards the nearest other tile
          $me = $('#tiles *[data-player="' + player + '"]');
          var myCenterX = $me.offset().left + $me.width() / 2;
          var myCenterY = $me.offset().top + $me.height() / 2;

          // Find the closest target
          var otherCenterX, otherCenterY, distance;
          var minimumDistance = +Infinity, $target;
          $('#tiles *[data-player]').each(function(otherPlayer, other) {
            $other = $(other);

            var otherCenterX = $other.offset().left + $other.width() / 2;
            var otherCenterY = $other.offset().top + $other.height() / 2;

            distance = (
              (myCenterX - otherCenterX) * (myCenterX - otherCenterX) +
              (myCenterY - otherCenterY) * (myCenterY - otherCenterY)
            );

            if (distance > 0 && distance < minimumDistance) {
              minimumDistance = distance;
              $target = $other;
            }
          });

          // Calculate the direction to that target
          var targetCenterX = $target.offset().left + $target.width() / 2;
          var targetCenterY = $target.offset().top + $target.height() / 2;

          // Get the length and normalized direciton
          var length = Math.sqrt(
            (targetCenterX - myCenterX) * (targetCenterX - myCenterX) +
            (targetCenterY - myCenterY) * (targetCenterY - myCenterY)
          );

          var directionX = (targetCenterX - myCenterX) / length;
          var directionY = (targetCenterY - myCenterY) / length;

          // If we're the chicken, invert that and run away rather than towards
          // Sharks also move away, once they've come in for the kill
          if (ai['type'] == 'chicken' || distance < 25) {
            directionX *= -1;
            directionY *= -1;
          }

          // Apply a force in that direction
          // Sharks and chickens accelerate more slowly or they'll stay right on the player
          vel[player][0] += directionX * PER_TICK_ACCELERATION * (Math.random() / 2 + 0.5);
          vel[player][1] += directionY * PER_TICK_ACCELERATION * (Math.random() / 2 + 0.5);

          break;
      }
    });

    $.each(vel, function(player, vel) {
      $game = $('#tiles');
      $tile = $('#tiles *[data-player="' + player + '"]');

      /*
      // Use friction to slow each box down over time
      vel[0] *= PER_TICK_FRICTION;
      vel[1] *= PER_TICK_FRICTION;
      */

      // Use friction to slow each box down over time
      // If we're close enough to zero that friction will accelerate us, just stop
      if (Math.abs(vel[0]) < PER_TICK_FRICTION) {
        vel[0] = 0;
      } else {
        vel[0] += (vel[0] > 0 ? -PER_TICK_FRICTION : PER_TICK_FRICTION);
      }

      if (Math.abs(vel[1]) < PER_TICK_FRICTION) {
        vel[1] = 0;
      } else {
        vel[1] += (vel[1] > 0 ? -PER_TICK_FRICTION : PER_TICK_FRICTION);
      }

      // Cap velocity so we don't go too fast
      vel[0] = Math.min(VELOCITY_CAP, Math.max(-VELOCITY_CAP, vel[0]));
      vel[1] = Math.min(VELOCITY_CAP, Math.max(-VELOCITY_CAP, vel[1]));

      // Update the current position based on velocity
      var left = $tile[0].offsetLeft + vel[0];
      var top = $tile[0].offsetTop + vel[1];

      // Bounce off the edges of the screen
      if (left < 0) {
        left = 0;
        vel[0] = Math.abs(vel[0]) / 2;
      } else if (left > $game.width() - $tile.width()) {
        left = $game.width() - $tile.width();
        vel[0] = -1 * Math.abs(vel[0]) / 2;
      }

      if (top < 0) {
        top = 0;
        vel[1] = Math.abs(vel[1]) / 2;
      } else if (top > $game.height() - $tile.height()) {
        top =  $game.height() - $tile.height();
        vel[1] = -1 * Math.abs(vel[1]) / 2;
      }

      // Finally, update the position
      $tile.css({'top': top, 'left': left});
    });
  };

  this.init = function() {
    // Initialize velocities to zero
    $game = $('#tiles');
    $('#tiles *[data-player]').each(function(i, eli) {
      vel[i] = [0, 0];
      $(eli).css({
        top: Math.random() * ($game.height() - $(eli).height()),
        left: Math.random() * ($game.width() - $(eli).width())
      });
    });

    // Reload keybindings in case they've changed
    loadKeyBindings();

    // Reload player types in case those have changed
    loadPlayerTypes();

    // Add keybindings, we can use the same function since it can check type
    $(document).unbind('keydown').bind('keydown', onkey);
    $(document).unbind('keyup').bind('keyup', onkey);

    running = true;
  }

  this.stop = function() {
    running = false;

    $.each(vel, function(player, vel) {
      $game = $('#tiles');
      $tile = $('#tiles *[data-player="' + player + '"]');
      $tile.css({'top': 10, 'left': 10 + player * 110});

      if ($tile.attr('data-disabled') == 'true') {
        $tile
          .hide()
          .css('left', '-1000px');
      }
    });

    $(document).unbind('keydown');
    $(document).unbind('keyup');
  };
};
