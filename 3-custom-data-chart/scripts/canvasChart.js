var CanvasChart = function() {
  var f,
    margin = { top: 40, left: 75, right: 0, bottom: 75 },
    chartHeight,
    chartWidth,
    yMax,
    xMax,
    data,
    maxYValue = 0,
    ratio = 0,
    pointRadius = 10,
    renderType = { lines: "lines", points: "points" },
    finalDataPoints = [],
    selectedDataPoint = null,
    timerID,
    overlayDiv,
    render = function(canvasID, dataObj) {
      // Get chart attributes and add event listener for mousemove
      data = dataObj;
      // Used to show a div representing the data value of the point they are hovering over in the canvas
      createOverlay();

      // Grab the canvas element
      var canvas = document.getElementById(canvasID);
      chartHeight = canvas.getAttribute("height");
      chartWidth = canvas.getAttribute("width");
      canvas.addEventListener("mousemove", mouseMove, false);
      f = canvas.getContext("2d");

      // Chart size, minus the margin values
      xMax = chartWidth - (margin.left + margin.right);
      yMax = chartHeight - (margin.top + margin.bottom);

      // Need maxYValue so that you can know how much of a gap to put between different labels on the y axis
      maxYValue = getMaxDataYValue();
      ratio = yMax / maxYValue;
      // render data based upon type of renderType(s) that client supplies
      if (data.renderType === undefined || data.renderType === null)
        data.renderType = [renderType.lines];
      // renderParts() will 'kick off' the rest of the functions in the application.
      renderParts();
    },
    renderParts = function() {
      renderBackground();
      renderText();
      renderLinesAndLabels(true);
      renderData();
    },
    renderBackground = function() {
      // Creates a gradient based on the margin values
      // It starts at the upper left hand corner and goes to the lower right hand corner
      var lingrad = f.createLinearGradient(
        margin.left,
        margin.top,
        xMax - margin.right,
        yMax
      );
      // Create color stops: Grey to white
      lingrad.addColorStop(0.0, "#D4D4D4");
      lingrad.addColorStop(0.2, "#fff");
      // Create color stops: White back to grey
      lingrad.addColorStop(0.8, "#fff");
      lingrad.addColorStop(1, "#D4D4D4");
      f.fillStyle = lingrad;
      // Fill gradient into a rectangle
      f.fillRect(
        margin.left,
        margin.top,
        xMax - margin.left,
        yMax - margin.top
      );
      f.fillStyle = "black";
    },
    renderText = function() {
      // Determine if they passed in a labelFont or not, if not, use 20pt Arial
      var labelFont = data.labelFont != null ? data.labelFont : "20pt Arial";
      f.font = labelFont;
      f.textAlign = "center";

      // Title
      // Starts in the middle of the canvas and is centered, so it comes out from the middle
      f.fillText(data.title, chartWidth / 2, margin.top / 2);

      // X-axis text
      var txtSize = f.measureText(data.xLabel);
      // Pass in the xLabel as the text,
      f.fillText(
        data.xLabel,
        margin.left + xMax / 2 - txtSize.width / 2, // We don't want to start rendering at the margin, so we add the margin amount, we have the center of the chart, and then subtract off half of the width of the actual text
        yMax + margin.bottom / 1.2 // then, we have the maximum Y added to a little bit more than the bottom margin.
      );

      // Y-axis text
      // When you rotate text, you change the axes.
      // Save state of context
      f.save();

      // Rotate backwards by 90 degrees
      f.rotate(-Math.PI / 2);

      // Set font
      f.font = labelFont;

      // Use the yLabel text, take the maximum Y value and divide by 2, and multiply by -1, because we did a negative rotation earlier
      // The 'Y' value is going first, followed by the 'X' value, because of the rotation. The axes are flipped.
      f.fillText(data.yLabel, yMax / 2 * -1, margin.left / 4);
      f.restore();
    },
    renderLinesAndLabels = function(shouldRenderText) {
      // Take the maximum Y value, and divide it by the length of the dataPoints array.
      var yInc = yMax / data.dataPoints.length;
      var yPos = 0;
      var xInc = getXInc();
      var xPos = margin.left;

      for (var i = 0; i < data.dataPoints.length; i++) {
        yPos += i == 0 ? margin.top : yInc;

        // Draw horizontal lines
        drawLine(
          {
            x: margin.left,
            y: yPos,
            x2: xMax,
            y2: yPos
          },
          "#E8E8E8"
        );

        if (shouldRenderText) {
          // y axis labels
          f.font =
            data.dataPointFont != null ? data.dataPointFont : "10pt Calibri";
          var txt = Math.round(maxYValue - (i == 0 ? 0 : yPos / ratio));
          var txtSize = f.measureText(txt);
          f.fillText(
            txt,
            margin.left - (txtSize.width >= 14 ? txtSize.width : 10) - 7,
            yPos + 4
          );

          // x-axis labels
          var txt = data.dataPoints[i].x;
          console.log(txt);
          txtSize = f.measureText(txt);
          f.fillText(txt, xPos, yMax + margin.bottom / 3);
          xPos += xInc;
        }
      }

      // Vertical Line
      drawLine({ x: margin.left, y: margin.top, x2: margin.left, y2: yMax });

      // Horizontal Line
      drawLine({ x: margin.left, y: yMax, x2: xMax, y2: yMax });
    },
    // Iterate throught the data points and get the x and y coordinates of each data point.
    renderData = function() {
      var xInc = getXInc(),
        prevX = 0,
        prevY = 0;
      for (var i = 0; i < data.dataPoints.length; i++) {
        var pt = data.dataPoints[i];
        var y = (maxYValue - pt.y) * ratio;
        if (y < margin.top) y = margin.top;
        var x = i * xInc + margin.left;

        // Calculate dataPoint details
        var dataPoint = {
          x: x,
          y: y,
          currX: margin.left,
          x2: prevX,
          y2: prevY,
          originalY: pt.y
        };
        finalDataPoints.push(dataPoint);

        prevX = x;
        prevY = y;
      }
      console.log(data);
      if (data.renderTypes.contains(renderType.lines)) drawLines();
      if (data.renderTypes.contains(renderType.points)) drawPoints();
    },
    drawPoints = function() {
      if (data.animatePoints) {
        // This is a function that we will add. The animate function will handle all the clearing and drawing of the lines, and other background stuff like gradients.
        // Then, it's going to move the data points over, pixel by pixel.
        animate();
      } else {
        // Otherwise we calculate out the static points
        for (var i = 0; i < finalDataPoints.length; i++) {
          var pt = finalDataPoints[i];
          renderCircle(pt.x, pt.y);
        }
      }
    },
    animate = function() {
      // If null, default to 20
      var speed = data.animationSpeed == null ? 20 : data.animationSpeed;
      // We are passing in this function so that it gets called when an animation frame is requested
      timerID = requestAnimationFrame(animate);
      clear();

      // Draw the guidelines
      drawLines();
      // Iterate through the finalDataPoints array and
      for (var i = 0; i < finalDataPoints.length; i++) {
        var pt = finalDataPoints[i];
        pt.currX += speed; // Animating x position to increment it here, point by point by point
        if (pt.currX >= pt.x) pt.currX = pt.x;
        renderCircle(pt.currX, pt.y);
        if (i == finalDataPoints.length - 1 && pt.currX == pt.x)
          cancelAnimationFrame(timerID);
      }
    },
    clear = function() {
      // Clear out the rectangle in the spaces where the gradient is
      f.clearRect(
        margin.left - pointRadius - 2,
        margin.top - pointRadius - 2,
        xMax,
        yMax - margin.bottom / 3
      );
      renderBackground();
      renderLinesAndLabels(false);
    },
    renderCircle = function(x, y, highlightColor) {
      // Create a radial gradient, using the supplied highlight color
      var radgrad = f.createRadialGradient(x, y, pointRadius, x - 5, y - 5, 0);
      radgrad.addColorStop(
        0,
        highlightColor == null ? "Green" : highlightColor
      );
      radgrad.addColorStop(0.9, "White");
      f.beginPath();
      f.fillStyle = radgrad;
      // Render circle, fill and stroke
      f.arc(x, y, pointRadius, 0, 2 * Math.PI, false);
      f.fill();
      f.lineWidth = 1;
      f.strokeStyle = "#000";
      f.stroke();
      f.closePath();
    },
    drawLines = function() {
      for (var i = 0; i < finalDataPoints.length; i++) {
        var pt = finalDataPoints[i];
        if (pt.x2 > 0) drawLine(pt);
      }
    },
    drawLine = function(pt, strokeStyle) {
      f.strokeStyle = strokeStyle == null ? "black" : strokeStyle;
      f.lineWidth = 1;
      f.beginPath();
      f.moveTo(pt.x2, pt.y2);
      f.lineTo(pt.x, pt.y);
      f.stroke();
      f.closePath();
    },
    getMaxDataYValue = function() {
      var maxY = 0;
      for (var i = 0; i < data.dataPoints.length; i++) {
        console.log(data.dataPoints[i].y);
        var y = data.dataPoints[i].y;
        if (y > maxY) maxY = y;
      }
      return maxY;
    },
    getXInc = function() {
      // Takes the width of the chart and divides it by the number of data points
      return Math.round(xMax / data.dataPoints.length) - 1;
    },
    createOverlay = function() {
      // Create overlay dic for displaying data
      overlayDiv = document.createElement("div");
      overlayDiv.style.display = "none";
      overlayDiv.style.backgroundColor = "#efefef";
      overlayDiv.style.border = "1px solid black";
      overlayDiv.style.position = "absolute";
      overlayDiv.style.padding = "5px";
      document.body.appendChild(overlayDiv);
    },
    clearCircle = function(x, y) {
      // Clear out with white to aboid duplicated borders (which don't look good)
      f.beginPath();
      f.fillStyle = "white";
      f.arc(x, y, pointRadius + 1, 0, 2 * Math.PI, false);
      f.fill();
      f.closePath();
    },
    showOverlay = function(pt) {
      // Grabs the original Y value from when you calculate out the data points.
      overlayDiv.innerHTML = pt.originalY;
      overlayDiv.style.left = pt.x + "px";
      overlayDiv.style.stop = pt.y + "px";
      overlayDiv.style.display = "block";
    },
    mouseMove = function(ev) {
      var x, y;
      // Get the mouse position relative to canvas
      if (ev.offsetX || ev.offsetX == 0) {
        x = ev.offsetX;
        y = ev.offsetY;
      } else if (ev.layerX || ev.layerX == 0) {
        // Firefox
        x = ev.layerX - margin.left + pointRadius * 2 + 5;
        y = ev.layerY - margin.top - 5;
      }

      // Loop through all the data points
      if (x > margin.left && y > margin.top) {
        var radius = pointRadius + 4;
        // Grab each data point and then take the X of that, and subtract it from the radius. This gives us the horizontal size.
        for (var i = 0; i < finalDataPoints.length; i++) {
          var pt = finalDataPoints[i];
          var xMin = pt.x - radius;
          var xMax = pt.x + radius;
          // Then find the vertical side
          var yMin = pt.y - radius;
          var yMax = pt.y + radius;
          // If X and Y are within the min and the max,
          if (x >= xMin && x <= xMax && (y >= yMin && y <= yMax)) {
            clearCircle(pt.x, pt.y);
            renderCircle(pt.x, pt.y, "Red");
            selectedDataPoint = pt;
            showOverlay(pt);
            //document.getElementById('output').innerHTML += '<br />' + x + " " + y;
            break;
          } else {
            if (selectedDataPoint != null) {
              overlayDiv.style.display = "none";
              clearCircle(selectedDataPoint.x, selectedDataPoint.y);
              renderCircle(selectedDataPoint.x, selectedDataPoint.y);
              selectedDataPoint = null;
            }
          }
        }
      }
    };

  // Public members
  return {
    render: render,
    renderType: renderType
  };
};
(function() {
  var lastTime = 0;
  var vendors = ["ms", "moz", "webkit", "o"];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[vendors[x] + "CancelAnimationFrame"] ||
      window[vendors[x] + "CancelRequestAnimationFrame"];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
})();

Array.prototype.contains = function(value) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == value) return true;
  }
  return false;
};
