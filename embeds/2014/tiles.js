var make2DArray = function(width, height, def) {
  var array = new Array(width);
  for (var x = 0; x < width; x++) {
    array[x] = new Array(height);
    for (var y = 0; y < height; y++) {
      array[x][y] = def;
    }
  }
  return array;
};

function Tile(frame) {
  var SORT_PER_TICK = 100;

  var index = parseInt($(frame).attr('data-player'));
  this.frame = frame;

  // Make the data available to other tiles
  this.data = make2DArray(frame.width, frame.height, 0);
  var buffer = make2DArray(frame.width, frame.height, 0);

  var frame_ctx = frame.getContext('2d');
  frame_ctx.imageSmoothingEnabled = false;

  var imageData = frame_ctx.createImageData(frame.width, frame.height);

  var scoringY = 0;
  this.scores = {};

  // Drop sand within this tile
  this.drop = function() {
    // Add a drop pixel
    this.data[frame.width / 2][frame.height - 1] = index + 1;

    // Clear the buffer
    for (var x = 0; x < frame.width; x++) {
      for (var y = 0; y < frame.height; y++) {
        buffer[x][y] = 0;
      }
    }

    // Update the buffer with falling cells
    var r = 0, xt = 0, yt = 0;
    for (var y = frame.height - 1; y >= 0; y--) {
      for (var x = 0; x < frame.width; x++) {
        // Skip empty cells
        if (this.data[x][y] == 0) continue;
        xt = x;
        yt = y;

        // Determine which way it's going to fall
        r = Math.random();
        if (r < 0.5) { // Straight down
          if (y > 0 && buffer[x][y - 1] == 0) {
            xt = x;
            yt = y - 1;
          }
        } else if (r < 0.7) { // Down left
          if (x > 0 && y > 0 && buffer[x - 1][y - 1] == 0) {
            xt = x - 1;
            yt = y - 1;
          }
        } else if (r < 0.9) { // Down right
          if (x < frame.width - 1 && y > 1 && buffer[x + 1][y - 1] == 0) {
            xt = x + 1;
            yt = y - 1;
          }
        } else if (r < 0.95) { // Straight left
          if (x > 0 && buffer[x - 1][y] == 0) {
            xt = x - 1;
            yt = y;
          }
        } else { // Straight right
          if (x < frame.width - 1 && buffer[x + 1][y] == 0) {
            xt = x + 1;
            yt = y;
          }
        }

        if (this.data[xt][yt] != 0) {
          xt = x;
          yt = y;
        }

        // Update the buffer
        buffer[xt][yt] = this.data[x][y];
      }
    }

    // Swap the buffer back to the data
    var temp = this.data;
    this.data = buffer;
    buffer = temp;
  }

  // Swap between overlapping buffers
  this.swap = function(self, others) {
    // Detect overlapping buffers, if so swap randomly
    $(others).each(function(_, other) {
      // If we're comparing to ourself, we'll always overlap, skip
      if (self == other) return;

      // If the two canvases don't overlap, don't look at them
      var frameBounds = frame.getBoundingClientRect();
      var otherBounds = other.frame.getBoundingClientRect();
      if (frameBounds.right < otherBounds.left ||
        frameBounds.left > otherBounds.right ||
        frameBounds.bottom < otherBounds.top ||
        frameBounds.top > otherBounds.bottom) {
        return;
      }

      // We only want this once, so give priority to whichever frame is 'lower' on the screen
      if (frameBounds.top < otherBounds.top) return;

      // TODO: Find the actual offset rather than looping over an entire image
      var otherX, otherY, temp;
      for (var frameY = 0; frameY < frame.height; frameY++) {
        for (var frameX = 0; frameX < frame.width; frameX++) {
          otherX = Math.floor(frameBounds.left - otherBounds.left + frameX);
          otherY = Math.floor(otherBounds.top - frameBounds.top + frameY);

          if (0 <= otherX && otherX < other.frame.width && 0 <= otherY && otherY < other.frame.height) {
            // Swap randomly half the time
            if (Math.random() < 0.5) {
              temp = self.data[frameX][frameY];
              self.data[frameX][frameY] = other.data[otherX][otherY];
              other.data[otherX][otherY] = temp;
            }
          }
        }
      }
    });
  };

  // Reorder a tile so that the pieces are sorted for scoring
  this.score = function() {
    if (scoringY > frame.height) return false;

    var i = 0;
    for (var x = 0; x < frame.width; x++) {
      i = this.data[x][scoringY];
      if (i > 0) {
        if (!(i in this.scores)) this.scores[i] = 0;
        this.scores[i] += 1;
        this.data[x][scoringY] = 0;
      }
    }

    scoringY += 1;
    return true;
  };

  this.resetScoring = function() {
    scoringY = 0;
    this.scores = {};
  };

  // Render this tile
  this.render = function() {
    // Render to the image data
    var r = 0, g = 0, b = 0, a = 255, i = 0;
    for (var y = 0; y < frame.height; y++) {
      for (var x = 0; x < frame.width; x++) {
        i = x + (frame.height - y) * frame.width;

        r = g = b = 0;
        a = 255;

        if (this.data[x][y] == 0) {
          a = 0;
        } else if (this.data[x][y] == 1) {
          b = 255;
        } else if (this.data[x][y] == 2) {
          r = 255;
        } else if (this.data[x][y] == 3) {
          g = 255;
        } else if (this.data[x][y] == 4) {
          r = 246;
          g = 96;
          b = 171;
        }

        imageData.data[i * 4 + 0] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = a;
      }
    }

    // Copy back to the GUI
    frame_ctx.putImageData(imageData, 0, 0);

    // Draw scores
    if (!($.isEmptyObject(this.scores))) {
      var totalScore = 0, highestPlayer = 0;
      frame_ctx.font = "12px monospaced";

      $.each(this.scores, function(player, score) {
        if (player == 1) {
          frame_ctx.fillStyle = "blue"
        } else if (player == 2) {
          frame_ctx.fillStyle = "red"
        } else if (player == 3) {
          frame_ctx.fillStyle = "green"
        } else if (player == 4) {
          frame_ctx.fillStyle = "hotPink"
        }

        frame_ctx.fillText(score, 10, 10 + 12 * player);

        totalScore += score;
        highestPlayer = Math.max(highestPlayer, player);
      });

      frame_ctx.fillStyle = "white"
      frame_ctx.fillText(totalScore, 10, 10 + 12 * (highestPlayer + 1));
    }
  };
}

function Tiles() {
  var running = false;
  var tiles = [];

  this.init = function() {
    running = true;

    tiles = [];
    $('canvas[data-player]').each(function(_, frame) {
      if ($(frame).attr('data-disabled') == "true") {
        // Don't simulate this one this time
      } else {
        tiles.push(new Tile(frame));
      }
    });
  };

  this.tick = function(scoring) {
    var stillScoring = false;

    if (scoring) {

      $.each(tiles, function(_, tile) { stillScoring = stillScoring || tile.score(); });

    } else if (running) {

      $.each(tiles, function(_, tile) { tile.drop(); });
      $.each(tiles, function(_, tile) { tile.swap(tile, tiles); });
      $.each(tiles, function(_, tile) { tile.render(); });

    }

    $.each(tiles, function(_, tile) { tile.render(); });

    return stillScoring;
  };

  this.stop = function() {
    running = false;
    scoring = true;

    $.each(tiles, function(_, tile) { tile.resetScoring(); });
  };

  this.getWinner = function() {
    var maxScore = -1, winner = -1, score = -1;

    $.each(tiles, function(player, tile) {
      score = 0;
      $.each(tile.scores, function(_, points) {
        score += points;
      });

      if (score > maxScore) {
        maxScore = score;
        winner = player;
      }
    });

    return winner;
  };
}
