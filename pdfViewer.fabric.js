//'use strict';

window.pdf24 = window.pdf24 || {};

pdf24.attachFabricToViewer = function(viewer) {
	var self = viewer.fabric = {
		pagesState : {},
		currentCanvas : null,
		state: {
			color: '#000000',
			fillColor: '#5B9BD5',
			strokeColor: '#41719C',
			strokeWidth: 2,
			opacity: 1.0,
			freeDraw: {
				brush: {
					name: 'PencilBrush',
					width: 30,
					color: 'rgba(221,181,0,0.3)',
					opacity: 0.3,
					shadow: {
						color: '#005E7A',
						width: 0,
						offset: 0
					}
				},
				lineMode: 'free'
			},
			clipboard: null,
			fontFamily: 'Helvetica',
			textAlign: 'left',
			lineHeight: 1.0,
			fontSize: 40
		},
		fontmap: {
			sans: 'Helvetica',
			serif: 'Times',
			mono: 'Courier'
		},
		stickyToolbarSelector: null,
		uiTools : [],
		uid_cnt : 0
	};

	self.initForBlacken = function() {
		self.state.color = '#000000';
		self.state.fillColor = '#000000';
		self.state.strokeColor = '#000000';
		self.state.strokeWidth = 0;
		self.state.freeDraw.brush.color = '#000000';
		self.state.freeDraw.brush.opacity = 1.0;
	};

	self.undo = {
		states : [],
		currentState : -1,
		restoring: false,
		stateChanged: function() {
			self.updateUiTools();
		},
		backup : function() {
			return self.exportPageState();
		},
		restore: function(state) {
			var _this = this;
			this.restoring = true;
			self.importPageState(state, function() {
				_this.restoring = false;
			});
		},
		push: function() {
			if(this.restoring || !self.currentCanvas) {
				return;
			}
			var state = this.backup();
			if(!state) {
				return;
			}
			if (this.states.length > 0 && state == this.states[this.currentState]) {
				return;
			}
			if (this.currentState >= 100) {
				this.currentState -= 1;
				this.states.shift();
			}
			if (this.currentState < this.states.length - 1) {
				this.states = this.states.slice(0, this.currentState + 1);
			}
			this.currentState += 1;
			this.states.push(state);
			this.stateChanged();
		},
		undo: function() {
			if (this.currentState > 0) {
				this.currentState -= 1;
				this.restore(this.states[this.currentState]);
				this.stateChanged();
			}
		},
		redo: function() {
			if (this.currentState < (this.states.length - 1)) {
				this.currentState++;
				this.restore(this.states[this.currentState]);
				this.stateChanged();
			}
		},
		export: function() {
			return {
				states: this.states,
				currentState: this.currentState
			};
		},
		import: function(exp) {
			this.states = exp.states;
			this.currentState = exp.currentState;
			this.stateChanged();
		},
		clear: function() {
			this.states = [];
			this.currentState = -1;
			this.stateChanged();
		},
		canUndo: function() {
			return this.currentState > 0;
		},
		canRedo: function() {
			return this.states.length > this.currentState + 1;
		}
	};

	var rgb2hex = function(rgb) {
		if (rgb.search("rgb") == -1) {
			return rgb;
		}
		function hex(x) {
			return ("0" + parseInt(x).toString(16)).slice(-2);
		}
		rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if(rgb) {
			return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
		}
		return '#000000';
	};

	var hexToRgb = function(hex, alpha) {
		hex = hex.replace('#', '');
		var r = parseInt(hex.length == 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16);
		var g = parseInt(hex.length == 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16);
		var b = parseInt(hex.length == 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16);
		if (alpha !== undefined) {
			return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
		}
		return 'rgb(' + r + ', ' + g + ', ' + b + ')';
	};

	var colorToRgba = function(color, alpha) {
		if (color.search("rgba") == -1) {
			var hex = rgb2hex(color);
			return hexToRgb(hex, alpha);
		}
		return color;
	};

	self.getSelection = function() {
		if(self.currentCanvas) {
			if(self.currentCanvas.getActiveObject) {
				var ao = self.currentCanvas.getActiveObject();
				if(ao) {
					return ao;
				}
			}
			if(self.currentCanvas.getActiveGroup) {
				var ao = self.currentCanvas.getActiveGroup();
				if(ao) {
					return ao;
				}
			}
		}
		return null;
	};

	self.discardSelection = function(update) {
		if(self.currentCanvas) {
			if(self.currentCanvas.discardActiveGroup) {
				self.currentCanvas.discardActiveGroup();
			}
			if(self.currentCanvas.discardActiveObject) {
				self.currentCanvas.discardActiveObject();
			}
			if(update) {
				self.currentCanvas.renderAll();
			}
		}
	};

	self.keyEventHandler = function(evt) {
		var fabricCanvas = self.currentCanvas;
		var activeElement = self.getSelection();

		evt = evt || window.event;
		var movementDelta = evt.ctrlKey ? 10 : 1;

		if (evt.keyCode === 37) { // left key
			evt.preventDefault();
			if (activeElement) {
				var a = activeElement.get('left') - movementDelta;
				activeElement.set('left', a);
			}
		} else if (evt.keyCode === 39) { // right key
			evt.preventDefault();
			if (activeElement) {
				var a = activeElement.get('left') + movementDelta;
				activeElement.set('left', a);
			}
		} else if (evt.keyCode === 38) { // up key
			evt.preventDefault();
			if (activeElement) {
				var a = activeElement.get('top') - movementDelta;
				activeElement.set('top', a);
			}
		} else if (evt.keyCode === 40) { // down key
			evt.preventDefault();
			if (activeElement) {
				var a = activeElement.get('top') + movementDelta;
				activeElement.set('top', a);
			}
		} else if (evt.keyCode === 46) { // del key
			evt.preventDefault();
			self.removeSelected();
		} else if (evt.keyCode === 67) { // c key
			if(evt.ctrlKey) {
				evt.preventDefault();
				if(activeElement) {
					activeElement.clone(function(clonedObj) {
						self.state.clipboard = clonedObj;
					});
				}
			}
		} else if (evt.keyCode === 86) { // v key
			if(evt.ctrlKey) {
				var clipboard = self.state.clipboard;
				if(clipboard) {
					clipboard.clone(function(clonedObj) {
						fabricCanvas.discardActiveObject();
						clonedObj.set({
							left: clonedObj.left + 10,
							top: clonedObj.top + 10,
							evented: true,
						});
						if (clonedObj.type === 'activeSelection') {
							// active selection needs a reference to the canvas.
							clonedObj.canvas = fabricCanvas;
							clonedObj.forEachObject(function(obj) {
								fabricCanvas.add(obj);
							});

							// this should solve the unselectability
							clonedObj.setCoords();
						} else {
							fabricCanvas.add(clonedObj);
						}
						fabricCanvas.setActiveObject(clonedObj);
						fabricCanvas.renderAll();
					});
				}
			}
		} else {
			//console.log(evt.keyCode);
		}

		if(activeElement) {
			activeElement.setCoords();
			fabricCanvas.renderAll();
		}
	};

	self.removeSelected = function() {
		var fabricCanvas = self.currentCanvas;
		var activeObject = self.getSelection();
		if(activeObject) {
			if(activeObject.type == 'group' || activeObject.type == 'activeSelection') {
				var objectsInGroup = activeObject.getObjects();
				self.discardSelection();
				objectsInGroup.forEach(function(object) {
					fabricCanvas.remove(object);
				});
			}
			fabricCanvas.remove(activeObject);
			fabricCanvas.renderAll();
		}
	},
	self.add = function(obj, activate) {
		self.currentCanvas.add(obj);
		if(activate) {
			self.currentCanvas.setActiveObject(obj);
		}
	};

	self.fixCenterPos = function(obj) {
		var target = viewer.jtarget;
		var wrapper = viewer.currentPage.wrapper;
		var offY = 0;
		var offX = 0;
		var objH = obj.height * obj.scaleY;

		if(target.height() < wrapper.height()) {
			offY = (wrapper.height() - target.height())/2 - target.scrollTop();
		}
		if(target.width() < wrapper.width()) {
			offX = (wrapper.width() - target.width())/2 - target.scrollLeft();
		}
		var left = obj.left - offX;
		var top = obj.top - offY;

		// compute visible bounds in window
		var wt = 0;
		if(self.stickyToolbarSelector) {
			wt = $(self.stickyToolbarSelector).outerHeight();
		}
		var rt = Math.max(0, $(window).scrollTop() - target.offset().top + wt);
		var rb = Math.max(0, target.offset().top - $(window).scrollTop() + target.height() - $(window).height());
		var vt = target.scrollTop() + rt;
		var vh = target.height() - rt - rb;
		var vb = vt + vh;

		// set new top to center new element vertically
		top = (vt + vb - objH) / 2;
		if(top + objH > wrapper.height()) {
			top -= top + objH - wrapper.height();
		}
		if(top < 0) {
			top = 0;
		}

		obj.set({left: left, top: top});
		obj.setCoords();
		self.currentCanvas.renderAll();
	};

	self.addCentered = function(obj, activate) {
		self.add(obj, activate);
		obj.center();
		self.fixCenterPos(obj);
	};

	self.minmax = function(v, min, max) {
		if(v < min) {
			v = min;
		}
		if(v > max) {
			v = max;
		}
		return v;
	};

	self.calcBoundsForPoints = function(points) {
		var minX = fabric.util.array.min(points, 'x') || 0;
		var minY = fabric.util.array.min(points, 'y') || 0;
		var maxX = fabric.util.array.max(points, 'x') || 0;
		var maxY = fabric.util.array.max(points, 'y') || 0;
		var height = (maxY - minY);
		var width = (maxX - minX);
		return {
			minX: minX,
			minY: minY,
			maxX: maxX,
			maxY: maxY,
			width: width,
			height: height
		};
	};

	self.createRelativePolygon = function(relPoints, w, h, options) {
		var evalExp = function(exp, w, h) {
			exp = exp.replace('h', '*h');
			exp = exp.replace('w', '*w');
			return eval(exp);
		};
		var evalExpArray = function(exp, w, h) {
			var results = [];
			if(Array.isArray(exp)) {
				for(var i=0; i<exp.length; i++) {
					results.push(evalExp(exp[i], w, h));
				}
			} else {
				results.push(evalExp(exp, w, h));
			}
			return results;
		};
		var evalExpPick = function(exp, w, h, v, fkt) {
			var values = evalExpArray(exp, w, h);
			values.push(v);
			return fkt.apply(null, values);
		};
		var makeAbsPoints = function(relPoints, w, h) {
			var absPoints = [];
			for(var i=0; i<relPoints.length; i++) {
				var p = relPoints[i];
				var absPoint = {
					x: evalExp(p.x, w, h),
					y: evalExp(p.y, w, h)
				};
				if(p.minX) {
					absPoint.x = evalExpPick(p.minX, w, h, absPoint.x, Math.max);
				}
				if(p.maxX) {
					absPoint.x = evalExpPick(p.maxX, w, h, absPoint.x, Math.min);
				}
				if(p.minY) {
					absPoint.y = evalExpPick(p.minY, w, h, absPoint.y, Math.max);
				}
				if(p.maxY) {
					absPoint.y = evalExpPick(p.maxY, w, h, absPoint.y, Math.min);
				}
				absPoints.push(absPoint);
			}

			// move to 0,0
			var bounds = self.calcBoundsForPoints(absPoints);
			for(var i=0; i<absPoints.length; i++) {
				absPoints[i].x -= bounds.minX;
				absPoints[i].y -= bounds.minY;
			}

			return {
				points: absPoints,
				width: bounds.width,
				height: bounds.height
			};
		};
		var abspoints = makeAbsPoints(relPoints, w, h);
		var polygon = new fabric.Polygon(abspoints.points, $.extend(options, {
			objectCaching: false
		}));

		// add scale event handler
		var scale = function() {
			var w = this.width * this.scaleX;
			var h = this.height * this.scaleY;

			var abspoints = makeAbsPoints(relPoints, w, h);
			var sx = w / abspoints.width;
			var sy = h / abspoints.height;

			this.points = abspoints.points;
			this.pathOffset.x = w / 2;
			this.pathOffset.y = h / 2;
			for(var i=0; i<this.points.length; i++) {
				this.points[i].x *= sx;
				this.points[i].y *= sy;
			}

			this.set({
				width: w,
				height: h,
				scaleX: 1,
				scaleY: 1
			});
		};
		polygon.on("scaling", scale);

		// override clone
		var oldClone = polygon.clone;
		var newClone = function(fkt) {
			oldClone.call(polygon, function(cloned) {
				cloned.objectCaching = false;
				cloned.clone = newClone;
				cloned.on('scaling', scale);
				fkt(cloned);
			});
		};
		polygon.clone = newClone;
		return polygon;
	};

	self.relativePolygons = {
		arrow : {
			width: 200,
			height: 100,
			points: [
				{x: '0', y: '0.3h'},
				{x: '0', y: '0.7h'},
				{x: '0.5w', y: '0.7h', minX: '1w-1h'},
				{x: '0.5w', y: '1h', minX: '1w-1h'},
				{x: '1w', y: '0.5h'},
				{x: '0.5w', y: '0', minX: '1w-1h'},
				{x: '0.5w', y: '0.3h', minX: '1w-1h'}
			]
		},
		hexagon: {
			width: 100,
			height: 100,
			points: [
				{x: '0.5w', y: '0h'},
				{x: '1w', y: '0.25h'},
				{x: '1w', y: '0.75h'},
				{x: '0.5w', y: '1h'},
				{x: '0w', y: '0.75h'},
				{x: '0w', y: '0.25h'}
			]
		},
		cross: {
			width: 100,
			height: 100,
			points: [
				{x: '0.3w', y: '0h'},
				{x: '0.7w', y: '0h'},
				{x: '0.7w', y: '0.3h'},
				{x: '1w', y: '0.3h'},
				{x: '1w', y: '0.7h'},
				{x: '0.7w', y: '0.7h'},
				{x: '0.7w', y: '1h'},
				{x: '0.3w', y: '1h'},
				{x: '0.3w', y: '0.7h'},
				{x: '0w', y: '0.7h'},
				{x: '0w', y: '0.3h'},
				{x: '0.3w', y: '0.3h'}
			]
		}
	};

	self.objectStore = {
		text: function(name, options, props) {
			var text = props.text || 'Text';
			var text = new fabric.IText(text, $.extend(options, {
				lineHeight: self.state.lineHeight || 1.0,
				fontSize: self.state.fontSize || 40,
				fontFamily: self.fontmap[self.state.fontFamily] || 'Helvetica',
				textAlign: self.state.textAlign || 'left',
				fill: '#000000',
				stroke: '#000000',
				strokeWidth: 0,
				opacity: 1
			}));
			text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
			text.on("scaling", function() {
			});
			return text;
		},
		rectangle: function(name, options, props) {
			var rect = new fabric.Rect($.extend(options, {
				width: 200,
				height: 100,
				objectCaching: false
			}));
			if(name == 'square') {
				rect.set('width', 100);
				rect.setControlsVisibility({ mb: false, ml: false, mr: false, mt: false });
			}
			rect.on("scaling", function() {
				rect.set({
					width: rect.width * rect.scaleX,
					height: rect.height * rect.scaleY,
					scaleX: 1,
					scaleY: 1
				});
			});
			return rect;
		},
		circle: function(name, options, props) {
			var circle = new fabric.Circle($.extend(options, {
				radius: 50,
				objectCaching: false
			}));
			circle.setControlsVisibility({ mb: false, ml: false, mr: false, mt: false });
			circle.on("scaling", function() {
				circle.set({
					radius: (circle.scaleX + circle.scaleY) / 2 * circle.radius,
					scaleX: 1,
					scaleY: 1
				});
			});
			return circle;
		},
		ellipse: function(name, options, props) {
			var ellipse = new fabric.Ellipse($.extend(options, {
				rx: 60,
				ry: 40,
				objectCaching: false
			}));
			ellipse.on("scaling", function() {
				ellipse.set({
					rx: ellipse.rx * ellipse.scaleX,
					ry: ellipse.ry * ellipse.scaleY,
					scaleX: 1,
					scaleY: 1
				});
			});
			return ellipse;
		},
		triangle: function(name, options, props) {
			var triangle = new fabric.Triangle($.extend(options, {
				width: 100,
				height: 100,
				objectCaching: false
			}));
			triangle.on("scaling", function() {
				triangle.set({
					width: triangle.width * triangle.scaleX,
					height: triangle.height * triangle.scaleY,
					scaleX: 1,
					scaleY: 1
				});
			});
			return triangle;
		},
		line: function(name, options, props) {
			var line = new fabric.Line([0, 0, 200, 0], $.extend(options, {
				strokeWidth: options.strokeWidth || 3,
				objectCaching: false
			}));
			line.setControlsVisibility({ bl: false, br: false, tl: false, tr: false, mt: true, mb: true });
			line.on("scaling", function() {
				line.set({
					width: line.width * line.scaleX,
					strokeWidth: Math.min(line.strokeWidth * line.scaleY, 50),
					scaleX: 1,
					scaleY: 1
				});
			});
			return line;
		},
		image: function(name, options, props) {
			var imgObj = props.image;
			var size = 200;
			var scale = Math.max(size / imgObj.width, size / imgObj.height);
			var image = new fabric.Image(imgObj, $.extend(options, {
				width: imgObj.width,
				height: imgObj.height,
				scaleX: scale,
				scaleY: scale,
				strokeWidth: 0
			}));
			image.on("scaling", function() {
			});
			return image;
		},
		star: function(name, options, props) {
			var starPolygonPoints = function(spikeCount, outerRadius, innerRadius) {
				var cx = outerRadius;
				var cy = outerRadius;
				var sweep = Math.PI / spikeCount;
				var points = [];
				var angle = -18 * Math.PI / 180;
				for (var i = 0; i < spikeCount; i++) {
					var x = cx + Math.cos(angle) * outerRadius;
					var y = cy + Math.sin(angle) * outerRadius;
					points.push({x: x, y: y});
					angle += sweep;

					x = cx + Math.cos(angle) * innerRadius;
					y = cy + Math.sin(angle) * innerRadius;
					points.push({x: x, y: y});
					angle += sweep
				}
				return points;
			}
			var points = starPolygonPoints(5, 60, 30);
			var star = new fabric.Polygon(points, $.extend(options, {
				strokeLineJoin: 'bevil'
			}, false));
			return star;
		},
		arrow1: function(name, options, props) {
			var rect = new fabric.Rect($.extend({}, options, {
				objectCaching: false
			}));
			var triangle = new fabric.Triangle($.extend({}, options, {
				objectCaching: false,
				angle:90
			}));
			var group = new fabric.Group([rect, triangle], $.extend({}, options, {
				objectCaching: false,
				width: 200,
				height: 50
			}));
			var calc = function() {
				group.set({
					width: group.width * group.scaleX,
					height: group.height * group.scaleY,
					scaleX: 1,
					scaleY: 1
				});
				triangle.set({
					left: group.width / 2,
					top: -group.height / 2,
					width: group.height,
					height: Math.min(group.height * 0.5, group.width/3)
				});
				rect.set({
					left: -group.width / 2,
					top: -group.height / 5 / 2,
					width: group.width - triangle.height - group.strokeWidth,
					height: group.height / 5
				});
			};
			calc();
			group.on("scaling", calc);
			return group;
		}
	};
	self.objectStore.square = self.objectStore.rectangle;
	self.objectStore.rect = self.objectStore.rectangle;

	self.createObject = function(name, props) {
		props = props || {};

		var options = {
			fill: self.state.fillColor || '#5B9BD5',
			stroke: self.state.strokeColor || '#41719C',
			strokeWidth: self.state.strokeWidth || 2,
			opacity: self.state.opacity || 1.0,
			padding: 6
		};

		if(name in self.objectStore) {
			return self.objectStore[name](name, options, props);
		}

		if(name in self.relativePolygons) {
			var relPolygon = self.relativePolygons[name];
			return self.createRelativePolygon(relPolygon.points, relPolygon.width, relPolygon.height, options);
		}

		return null;
	};

	self.addObject = function(obj) {
		if(obj) {
			self.addCentered(obj, true);
			self.undo.push();
		}
	};

	self.addText = function() {
		var text = self.createObject('text');
		self.addObject(text);
	};

	self.addShape = function(shape) {
		var shape = self.createObject(shape);
		self.addObject(shape);
	};

	self.addImage = function(img) {
		var img = self.createObject('image', {image: img});
		self.addObject(img);
	};

	self.zoomCanvas = function(factor, canvas) {
		canvas = canvas || self.currentCanvas;
		canvas.setHeight(canvas.getHeight() * factor);
		canvas.setWidth(canvas.getWidth() * factor);
		if (canvas.backgroundImage) {
			var bi = canvas.backgroundImage;
			bi.width = bi.width * factor; bi.height = bi.height * factor;
		}
	};

	self.zoomObjects = function(factor, canvas) {
		canvas = canvas || self.currentCanvas;
		var objects = canvas.getObjects();
		for (var i=0; i<objects.length; i++) {
			var o = objects[i];
			var scaleX = o.scaleX;
			var scaleY = o.scaleY;
			var left = o.left;
			var top = o.top;

			o.scaleX = scaleX * factor;
			o.scaleY = scaleY * factor;
			o.left = left * factor;
			o.top = top * factor;

			o.setCoords();
		}
		canvas.renderAll();
		canvas.calcOffset();
	};

	self.zoom = function(factor) {
		self.zoomCanvas(factor);
		self.zoomObjects(factor);
	};

	self.getBounds = function(objects, skipInvisible) {
		var xmin = Number.MAX_VALUE;
		var ymin = Number.MAX_VALUE;
		var xmax = 0;
		var ymax = 0;
		for(var i=0; i<objects.length; i++) {
			var o = objects[i];
			if(skipInvisible && o.opacity === 0) {
				continue;
			}
			xmin = Math.min(xmin, o.left);
			ymin = Math.min(ymin, o.top);
			xmax = Math.max(xmax, o.left + o.width);
			ymax = Math.max(ymax, o.top + o.height);
		}
		return [xmin, ymin, xmax, ymax];
	};

	self.cropSvg = function(svgStr, skipInvisible, callback) {
		fabric.loadSVGFromString(svgStr, function(objects, options) {
			var bounds = self.getBounds(objects, skipInvisible);
		   	var viewBox = [
		   		bounds[0], bounds[1],
		   		bounds[2] - bounds[0],
		   		bounds[3] - bounds[1]
		   	];

		   	var viewBoxRe = /(<svg[^>]+viewBox\s?=\s?")([^"]+)"/;
		   	if(svgStr.match(viewBoxRe)) {
		   		svgStr = svgStr.replace(viewBoxRe, '$01' + viewBox.join(' '));
		   	} else {
		   		svgStr = svgStr.replace('<svg', '<svg viewBox="'+ viewBox.join(' ') +'"');
		   	}

		   	svgStr = svgStr.replace(/width\s?=\s?"[^"]+"/, 'width="'+ viewBox[2] +'"');
	   		svgStr = svgStr.replace(/height\s?=\s?"[^"]+"/, 'height="'+ viewBox[3] +'"');

		   	callback(svgStr);
		});
	};

	self.cropCanvas = function(canvas, callback) {
		var objects = canvas.getObjects();
		var bounds = self.getBounds(objects);
		var xmin = bounds[0];
		var ymin = bounds[1];
		var xmax = bounds[2];
		var ymax = bounds[3];
		if(xmin >= xmax || ymin >= ymax) {
			return;
		}
		var w = xmax - xmin + (window.devicePixelRatio || 1);
		var h = ymax - ymin + (window.devicePixelRatio || 1);

		var croppedCanvas = document.createElement('canvas');
		croppedCanvas.width = w;
		croppedCanvas.height = h;

		var croppedFabricCanvas = new fabric.Canvas(croppedCanvas);
		croppedFabricCanvas.loadFromJSON(JSON.stringify(canvas), function() {
			var objects = croppedFabricCanvas.getObjects();
			for(var i=0; i<objects.length; i++) {
				var o = objects[i];
				o.left -= xmin;
				o.top -= ymin;
				o.setCoords();
			}
			croppedFabricCanvas.renderAll();
			croppedFabricCanvas.calcOffset();
			callback(croppedFabricCanvas);
		});
	};

	self.normRotate = function(rotate) {
		return ((rotate % 360) + 360) % 360;
	};

	self.exportPageState = function() {
		var fabricCanvas = self.currentCanvas;
		var currentPage = viewer.currentPage;

		if(fabricCanvas && currentPage.pdfPage) {
			var jsonStr = JSON.stringify(fabricCanvas);
			var rotate = self.normRotate(currentPage.pdfPage.rotate || 0);
			var view = currentPage.pdfPage.view;
			return {
				pageNum : currentPage.pageNum,
				json: jsonStr,
				width: fabricCanvas.width,
				height: fabricCanvas.height,
				viewWidth: view[2] - view[0],
				viewHeight: view[3] - view[1],
				viewRotate: rotate
			};
		}
		return null;
	};

	self.importPageState = function(pageState, callback) {
		callback = callback || function() {};
		var fabricCanvas = self.currentCanvas;
		if(fabricCanvas) {
			fabricCanvas.clear();
			fabricCanvas.loadFromJSON(pageState.json, function() {
				var scale = fabricCanvas.width / pageState.width;
				self.zoomObjects(scale);
				fabricCanvas.renderAll();
				callback(true);
			});
		} else {
			callback(false);
		}
	}

	self.importRenderedSvg = function(callback) {
		callback = callback || function() {};
		var fabricCanvas = self.currentCanvas;
		var pdfPage = viewer.currentPage.pdfPage;
	 	var viewport = pdfPage.getViewport(1);
	 	pdfPage.getOperatorList().then(function (opList) {
			var svgGfx = new pdf24.pdfjs.SVGGraphics(pdfPage.commonObjs, pdfPage.objs);
			svgGfx.embedFonts = true;
			svgGfx.getSVG(opList, viewport).then(function (svg) {
				//$('body').append(svg);
				fabric.parseSVGDocument(svg, function(objects, options) {
					var loadedObject = fabric.util.groupSVGElements(objects, options);
					fabricCanvas.add(loadedObject);
					loadedObject.setCoords();
					fabricCanvas.renderAll();
					callback(true);
				});
			});
		});
	};

	self.savePageState = function() {
		var pageState = self.exportPageState();
		if(pageState) {
			self.pagesState[pageState.pageNum] = pageState;
		}
	};

	self.restorePageState = function(pageNum, callback) {
		callback = callback || function() {};
		if(pageNum in self.pagesState) {
			var pageState = self.pagesState[pageNum];
			self.importPageState(pageState, callback);
		} else {
			if(false) {
				self.importRenderedSvg(callback);
			} else {
				callback(false);
			}
		}
	};

	self.createSvgs = function(callback) {
		self.savePageState();

		var svgState = {
			init: function() {
				this.svgs = {};
				this.pagesPut = {};
			},
			checkCallback: function() {
				for(var k in self.pagesState) {
					if(self.pagesState.hasOwnProperty(k) && !this.pagesPut[k]) {
						return;
					}
				}
				callback(this.svgs);
			},
			putSvg: function(page, svg) {
				if(svg) {
					this.svgs[page] = svg;
				}
				this.pagesPut[page] = true;
				this.checkCallback();
			}
		};
		svgState.init();

		var pageStateHandler = function(page, pageState) {
			var canvas = document.createElement('canvas');
			canvas.height = pageState.height;
			canvas.width = pageState.width;

			var fabricCanvas = new fabric.Canvas(canvas);
			fabricCanvas.loadFromJSON(pageState.json, function() {
				var numObjects = fabricCanvas.getObjects().length;
				if(numObjects > 0) {
					var vw = pageState.viewWidth;
					var vh = pageState.viewHeight;
					if(pageState.viewRotate == 90 || pageState.viewRotate == 270) {
						var tmp = vw;
						vw = vh;
						vh = tmp;
					}
					var svg = fabricCanvas.toSVG({
						width : vw + 'pt',
						height : vh + 'pt'
					});
					fabricCanvas.dispose();

					svgState.putSvg(page, svg);
				} else {
					svgState.putSvg(page, null);
				}
			});
		};

		for(var k in self.pagesState) {
			self.pagesState.hasOwnProperty(k) && pageStateHandler(k, self.pagesState[k]);
		}
	};

	var createFreeDrawBrush = function(name) {
		name = name || self.state.freeDraw.brush.name;
		var brush = null;

		if(name == 'vLinePatternBrush') {
			brush = new fabric.PatternBrush(self.currentCanvas);
			brush.getPatternSrc = function() {
				var patternCanvas = fabric.document.createElement('canvas');
				patternCanvas.width = patternCanvas.height = 10;
				var ctx = patternCanvas.getContext('2d');
				ctx.strokeStyle = this.color;
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.moveTo(0, 5);
				ctx.lineTo(10, 5);
				ctx.closePath();
				ctx.stroke();
				return patternCanvas;
			};
		}
		else if(name == 'hLinePatternBrush') {
			brush = new fabric.PatternBrush(self.currentCanvas);
			brush.getPatternSrc = function() {
				var patternCanvas = fabric.document.createElement('canvas');
				patternCanvas.width = patternCanvas.height = 10;
				var ctx = patternCanvas.getContext('2d');

				ctx.strokeStyle = this.color;
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.moveTo(5, 0);
				ctx.lineTo(5, 10);
				ctx.closePath();
				ctx.stroke();

				return patternCanvas;
			};
		}
		else if(name == 'squarePatternBrush') {
			brush = new fabric.PatternBrush(self.currentCanvas);
			brush.getPatternSrc = function() {
				var squareWidth = 10, squareDistance = 2;

				var patternCanvas = fabric.document.createElement('canvas');
				patternCanvas.width = patternCanvas.height = squareWidth + squareDistance;
				var ctx = patternCanvas.getContext('2d');

				ctx.fillStyle = this.color;
				ctx.fillRect(0, 0, squareWidth, squareWidth);

				return patternCanvas;
			};
		}
		else if(name == 'diamondPatternBrush') {
			brush = new fabric.PatternBrush(self.currentCanvas);
			brush.getPatternSrc = function() {
				var squareWidth = 10, squareDistance = 5;
				var patternCanvas = fabric.document.createElement('canvas');
				var rect = new fabric.Rect({
					width: squareWidth,
					height: squareWidth,
					angle: 45,
					fill: this.color
				});

				var canvasWidth = rect.getBoundingRect().width;

				patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance;
				rect.set({ left: canvasWidth / 2, top: canvasWidth / 2 });

				var ctx = patternCanvas.getContext('2d');
				rect.render(ctx);

				return patternCanvas;
			};
		}
		else if(fabric[name]) {
			brush = new fabric[name](self.currentCanvas);
		}

		if (brush) {
			brush.name = name;
			brush.width = self.state.freeDraw.brush.width;

			if(self.state.freeDraw.brush.shadow.width) {
				brush.shadow = new fabric.Shadow({
					blur: self.state.freeDraw.brush.shadow.width,
					offsetX: self.state.freeDraw.brush.shadow.offset,
					offsetY: self.state.freeDraw.brush.shadow.offset,
					color: self.state.freeDraw.brush.shadow.color,
					affectStroke: true
				});
			}

			var color = tinycolor(self.state.freeDraw.brush.color);
			brush.color = color.toRgbString();

			// stright line support
			if(name == 'PencilBrush') {
				brush.oldOnMouseMove = brush.onMouseMove;
				brush.onMouseMove = function(pointer, options) {
					brush.oldOnMouseMove(pointer, options);
					if(self.state.freeDraw.lineMode == 'straight') {
						if(brush._points && brush._points.length > 2) {
							var points = brush._points;
							brush._points = [ points[0], points[points.length-1] ];
						}
					}
					brush.canvas.clearContext(brush.canvas.contextTop);
					brush._render();
				};
			}
		}

		return brush;
	};

	var changeActiveObject = function(fkt) {
		var activeObject = self.getSelection();
		if(activeObject) {
			fkt(activeObject);
			activeObject.setCoords();
			self.currentCanvas.renderAll();
			self.undo.push();
			self.updateUiTools();
		}
		return activeObject;
	};

	var uiToolsHelper = {
		change: function(fkt) {
			return function() {
				fkt.apply(this, arguments);
				self.updateUiTools();
			};
		},
		getInput: function(o, tagName) {
			var tn = o.prop('tagName').toLowerCase();
			if(tn == tagName) {
				return o;
			}
			return o.find(tagName);
		},
		propToVal: function(ie, propName, filter, setValue) {
			setValue = setValue || function(v) {
				if(v === null || v === undefined) {
					v = '';
				}
				ie.val("" + v);
			};
			return function() {
				var activeObject = self.getSelection();
				if(activeObject) {
					var v = activeObject.get(propName);
					if(filter) {
						v = filter(v, activeObject);
					}
					setValue(v);
				}
			};
		},
		valToProp: function(ie, propName, filter, getValue) {
			getValue = getValue || function() {
				return ie.val();
			};
			return function() {
				if(ie) {
					changeActiveObject(function(activeObject) {
						var v = getValue();
						if(filter) {
							v = filter(v, activeObject);
						}
						activeObject.set(propName, v);
					});
				}
			};
		},
		propToClass: function(uiObj, propName, className, decider) {
			return function() {
				var activeObject = self.getSelection();
				if(activeObject) {
					var v = activeObject.get(propName);
					var t = false;
					if(Array.isArray(decider)) {
						t = decider.indexOf(v) >= 0;
					} else if(typeof decider == 'function') {
						t = decider(v);
					} else {
						t = v == decider;
					}
					uiObj.toggleClass(className, t);
				}
			};
		},
		classToProp: function(uiObj, propName, className, valSet, valUnset,  state) {
			return function() {
				changeActiveObject(function(activeObject) {
					uiObj.toggleClass(className, state);
					activeObject.set(propName, uiObj.hasClass(className) ? valSet : valUnset);
				});
			};
		},
		isSelection: function(includeTypes, excludeTypes, userCheck) {
			var parseTypes = function(types) {
				types = types.split(',');
				types = types.map(function(s) {
					return s.trim();
				});
				return types;
			};
			if(includeTypes) {
				includeTypes = parseTypes(includeTypes);
			}
			if(excludeTypes) {
				excludeTypes = parseTypes(excludeTypes);
			}
			return function() {
				var sel = self.getSelection();
				if(sel) {
					var selType = sel.get('type');
					if(excludeTypes && excludeTypes.indexOf(selType) >= 0) {
						return false;
					}
					if(includeTypes) {
						if(includeTypes.indexOf(selType) >= 0) {
							return true;
						}
						return false;
					}
					if(userCheck) {
						return userCheck(sel);
					}
				}
				return sel;
			}
		},
		changeOnEnter : function(ie) {
			ie.on('keyup', function(e) {
				if (e.keyCode == 13) {
					ie.change();
				}
			});
		}
	};

	var uiTools = {
		group : function(o) {
			return {
				obj: o,
				group: true,
				isEnabled: function() {
					return o.children('[data-role]:not(.disabled)').length > 0;
				}
			};
		},
		removeButton : function(o) {
			o.click(function() {
				self.removeSelected();
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: function() {
					return self.getSelection() && !uiTools.isFreeDrawMode();
				}
			};
		},
		undoButton : function(o) {
			o.click(function() {
				self.undo.undo();
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: function() {
					return self.undo.canUndo();
				}
			};
		},
		redoButton : function(o) {
			o.click(function() {
				self.undo.redo();
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: function() {
					return self.undo.canRedo();
				}
			};
		},
		addTextButton: function(o) {
			o.click(function() {
				self.addText();
			});
			return {
				obj: o,
				isEnabled: function() {
					return !uiTools.isFreeDrawMode();
				}
			};
		},
		addImageButton: function(o) {
			var uploadInput = $('<input type="file" accept="image/*" style="display:none"/>');
			uploadInput.on('change', function(evt) {
				if (!window.FileReader) {
					 alert('FileReader API is not supported in this browser.');
					 return;
				}
				var files = evt.target.files;
				if(files.length > 0) {
					var file = files[0];
					var reader = new FileReader();
					reader.onload = function(e) {
						var dataUrl = e.target.result;
						var imgObj = new Image();
						imgObj.src = dataUrl;
						imgObj.onload = function () {
							self.addImage(imgObj);
						};
					};
					reader.readAsDataURL(file);
				}
			});

			o.click(function() {
				uploadInput.trigger('click');
			});
			return {
				obj: o,
				isEnabled: function() {
					return !uiTools.isFreeDrawMode();
				}
			};
		},
		opacityInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', uiToolsHelper.valToProp(ie, 'opacity', function(v) {
				v = parseFloat(v);
				self.state.opacity = v;
				return v;
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection(),
				update: uiToolsHelper.propToVal(ie, 'opacity')
			};
		},
		opacitySelect: function(o) {
			var ie = uiToolsHelper.getInput(o, 'select');
			ie.on('change', uiToolsHelper.valToProp(ie, 'opacity', function(v) {
				v = parseInt(v) / 100.0;
				self.state.opacity = v;
				return v;
			}));
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection(),
				update: uiToolsHelper.propToVal(ie, 'opacity', function(v) {
					return Math.round(v * 100);
				})
			};
		},
		fontFamilySelect: function(o) {
			var ie = uiToolsHelper.getInput(o, 'select');
			self.state.fontFamily = ie.val();
			ie.on('change', function() {
				self.state.fontFamily = ie.val();
				changeActiveObject(function(activeObject) {
					var val = self.fontmap[ie.val()] || 'Helvetica';
					activeObject.set('fontFamily', val);
				});
			});
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text')
			};
		},
		fontSizeInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change', uiToolsHelper.valToProp(ie, 'fontSize', function(v, activeObject) {
				var scale = (activeObject.scaleX + activeObject.scaleY) / 2;
				v = parseFloat(v) / scale;
				return v;
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToVal(ie, 'fontSize', function(v, activeObject) {
					var scale = (activeObject.scaleX + activeObject.scaleY) / 2;
					return Math.ceil(v * scale);
				})
			};
		},
		lineHeightInput: function(o) {
			var precisionRound = function(number, precision) {
				var factor = Math.pow(10, precision);
				return Math.round(number * factor) / factor;
			};
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change', uiToolsHelper.valToProp(ie, 'lineHeight', function(v, activeObject) {
				return parseFloat(v);
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToVal(ie, 'lineHeight', function(v, activeObject) {
					return precisionRound(v, 1).toFixed(1);
				})
			};
		},
		textBoldButton: function(o) {
			o.on('click', uiToolsHelper.classToProp(o, 'fontWeight', 'down', 'bold', 'normal'));
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToClass(o, 'fontWeight', 'down', 'bold')
			};
		},
		textItalicButton: function(o) {
			o.on('click', uiToolsHelper.classToProp(o, 'fontStyle', 'down', 'italic', 'normal'));
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToClass(o, 'fontStyle', 'down', 'italic')
			};
		},
		textDecoration: function(o, value, extraPropName) {
			var clsToProp1 = uiToolsHelper.classToProp(o, 'textDecoration', 'down', value, '');
			var clsToProp2 = uiToolsHelper.classToProp(o, extraPropName, 'down', true, false);
			o.on('click', function() {
				clsToProp1();
				clsToProp2();
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToClass(o, extraPropName, 'down', true)
			};
		},
		textUnderLineButton: function(o) {
			return this.textDecoration(o, 'underline', 'underline');
		},
		textOverlineButton: function(o) {
			return this.textDecoration(o, 'overline', 'overline');
		},
		textLinethroughButton: function(o) {
			return this.textDecoration(o, 'line-through', 'linethrough');
		},
		textAlign: function(o, value) {
			var clsToProp = uiToolsHelper.classToProp(o, 'textAlign', 'down', value, 'left', true);
			o.on('click', function() {
				clsToProp();
				self.updateUiTools();
				self.state.textAlign = o.hasClass('down') ? value : 'left';
			});
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection('text, i-text'),
				update: uiToolsHelper.propToClass(o, 'textAlign', 'down', value)
			};
		},
		textAlignLeftButton: function(o) {
			return this.textAlign(o, 'left');
		},
		textAlignCenterButton: function(o) {
			return this.textAlign(o, 'center');
		},
		textAlignRightButton: function(o) {
			return this.textAlign(o, 'right');
		},
		addShapeSelect: function(o) {
			var ie = uiToolsHelper.getInput(o, 'select');
			ie.change(function() {
				var s = ie.val();
				if(s) {
					self.addShape(s);
				}
				ie.val('');
			});
			return {
				obj: o,
				isEnabled: function() {
					return !uiTools.isFreeDrawMode();
				}
			};
		},
		addShapeButton: function(o) {
			o.click(function() {
				var shape = o.data('shape');
				if(shape) {
					self.addShape(shape);
				}
			});
			return {
				obj: o,
				isEnabled: function() {
					return !uiTools.isFreeDrawMode();
				}
			};
		},
		colorInputTool: function(o, options) {
			var propName = options.propName || null;
			var stateKey = options.stateKey || null;
			var isEnabled = options.isEnabled || uiToolsHelper.isSelection();
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', uiToolsHelper.valToProp(ie, propName, function(v) {
				if(stateKey) {
					self.state[stateKey] = v;
				}
				return v;
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: isEnabled,
				update: uiToolsHelper.propToVal(ie, propName, function(v) {
					v = v || 'transparent';
					v = rgb2hex(v);
					return v;
				})
			};
		},
		colorInputTool2: function(o, config) {
			var mode = o.data('mode');
			var ie = uiToolsHelper.getInput(o, 'input');
			var setValue = function(v) {
				v = v || 'transparent';
				if(mode == 'spectrum') {
					ie.spectrum('set', v);
				} else {
					ie.val('' + rgb2hex(v));
				}
			};
			var getValue = function() {
				if(mode == 'spectrum') {
					return ie.spectrum('get').toRgbString();
				}
				return ie.val();
			};
			var onChange = config.onChange || function(c) {
				if(config.propName) {
					var fkt = uiToolsHelper.valToProp(ie, config.propName, null, getValue);
					fkt(c);
				}
				if(config.stateKey) {
					self.state[config.stateKey] = getValue();
				}
			};
			var isEnabled = config.isEnabled || uiToolsHelper.isSelection();
			var onUpdate = config.onUpdate || function() {
				if(config.propName) {
					var fkt = uiToolsHelper.propToVal(ie, config.propName, null, setValue);
					fkt();
				} else if(config.currentColor) {
					var cc = config.currentColor();
					setValue(cc);
				}
			};
			if(mode == 'spectrum') {
				var cls = 'spectrum-' + (self.uid_cnt++);
				ie.spectrum({
					showAlpha: true,
					color: o.val(),
					replacerClassName: cls,
					change: function(color) {
						var c = "transparent";
						if(color) {
							c = color.toRgbString();
						}
						onChange(c);
					}
				});
				ie.parent().find('.' + cls).attr('title', ie.attr('title') || '');
			} else {
				ie.on('change input', function() {
					onChange(ie.val());
				});
				uiToolsHelper.changeOnEnter(ie);
			}
			return {
				obj: o,
				isEnabled: isEnabled,
				update: function() {
					return onUpdate({
						ie: ie,
						onUpdate: onUpdate
					});
				}
			};
		},
		strokeColorInput: function(o) {
			return this.colorInputTool2(o, {
				propName: 'stroke',
				stateKey: 'strokeColor',
				isEnabled: uiToolsHelper.isSelection(null, 'image')
			});
		},
		fillColorInput: function(o) {
			return this.colorInputTool2(o, {
				propName: 'fill',
				stateKey: 'fillColor',
				isEnabled: uiToolsHelper.isSelection(null, 'image')
			});
		},
		deepSetPropForObject: function(obj, propName, propValue) {
			obj.set(propName, propValue);

			var type = obj.get('type');
			if(type == 'group' || type == 'path-group') {
				var objects = obj.getObjects();
				for(var i=0; i<objects.length; i++) {
					this.deepSetPropForObject(objects[i], propName, propValue);
				}
			}
		},
		setColorForObject: function(obj, color) {
			var type = obj.get('type');
			if(type == 'group' || type == 'path-group') {
				var objects = obj.getObjects();
				for(var i=0; i<objects.length; i++) {
					this.setColorForObject(objects[i], color);
				}
			}
			else if(type == 'i-text' || type == 'text') {
				obj.set('fill', color);
			}
			else if(type == 'path') {
				obj.set('stroke', color);
			}
			else {
				console.log('setColorForObject, no handler for type:', type);
			}
		},
		colorInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			self.state.color = ie.val();
			var mode = ie.data('mode');
			var changeHandler = function(newColor) {
				self.state.color = newColor;
				var activeObject = self.getSelection();
				if(activeObject) {
					uiTools.setColorForObject(activeObject, newColor);
					self.currentCanvas.renderAll();
				}
			};
			if(mode == 'spectrum') {
				var cls = 'spectrum-' + (self.uid_cnt++);
				ie.spectrum({
					showAlpha: false,
					color: o.val(),
					replacerClassName: cls,
					change: function(color) {
						var c = "transparent";
						if(color) {
							c = color.toRgbString();
						}
						changeHandler(c);
					}
				});
				ie.parent().find('.' + cls).attr('title', ie.attr('title') || '');
			} else {
				ie.on('change', function() {
					changeHandler(ie.val());
				});
				uiToolsHelper.changeOnEnter(ie);
			}
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection()
			};
		},
		colorButtonTool: function(o, options) {
			var initialColor = options.initialColor || 'green';
			var barHeight = options.barHeight || '5px';
			var isEnabled = options.isEnabled || uiToolsHelper.isSelection();
			var barWrapper = $('<div/>').css({
				position: 'absolute',
				bottom: 0,
				left: 0,
				height: barHeight,
				width: '100%',
				'background-image': 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAABCAYAAADn9T9+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAHYcAAB2HAY/l8WUAAAATSURBVBhXYzhz5sx/dIwJ/v8HANRwJNyOB28JAAAAAElFTkSuQmCC")',
				'background-repeat': 'repeat'
			});
			var bar = $('<div/>').css({
				position: 'absolute',
				bottom: 0,
				left: 0,
				height: '100%',
				width: '100%',
				'background-color': initialColor
			});
			barWrapper.append(bar);
			var onUpdate = options.onUpdate || function() {
				if(options.propName) {
					var activeObject = self.getSelection();
					if(activeObject) {
						var v = activeObject.get(options.propName) || 'transparent';
						o.spectrum("set", v);
						bar.css('background-color', v);
					}
				}
			};
			var onChange = options.onChange || function(c) {
				if(options.propName) {
					changeActiveObject(function(activeObject) {
						uiTools.deepSetPropForObject(activeObject, options.propName, c);
					});
				}
				if(options.stateName) {
					self.state[options.stateName] = c;
				}
			};
			o.css('position','relative').append(barWrapper);
			o.spectrum({
				showAlpha: true,
				color: initialColor,
				change: function(color) {
					var c = "transparent";
					if(color) {
						c = color.toRgbString();
					}
					bar.css('background-color', c);
					onChange(c);
				}
			});
			return {
				obj: o,
				isEnabled: isEnabled,
				update: onUpdate
			};
		},
		fillColorButton: function(o) {
			return this.colorButtonTool(o, {
				propName: 'fill',
				stateName: 'fillColor',
				isEnabled: uiToolsHelper.isSelection(null, 'image')
			});
		},
		strokeColorButton: function(o) {
			return this.colorButtonTool(o, {
				propName: 'stroke',
				stateName: 'strokeColor',
				isEnabled: uiToolsHelper.isSelection()
			});
		},
		strokeWidthInput: function(o) {
			var decimals = parseInt(o.data('decimals')) || 0;
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change', uiToolsHelper.valToProp(ie, 'strokeWidth', function(v, activeObject) {
				var scale = ((activeObject.scaleX || 1) + (activeObject.scaleY || 1)) / 2.0;
				v = parseFloat(v, 10) || 0;
				v /= scale;
				self.state.strokeWidth = v;
				return v;
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: uiToolsHelper.isSelection(),
				update: uiToolsHelper.propToVal(ie, 'strokeWidth', function(v, activeObject) {
					var scale = ((activeObject.scaleX || 1) + (activeObject.scaleY || 1)) / 2.0;
					v *= scale;
					v = v.toFixed(decimals);
					return v;
				})
			};
		},
		isFreeDrawMode: function() {
			return self.currentCanvas && self.currentCanvas.isDrawingMode && self.currentCanvas.freeDrawingBrush;
		},
		freeDrawButton: function(o) {
			o.on('click', function() {
				self.currentCanvas.isDrawingMode = !self.currentCanvas.isDrawingMode;
				if(self.currentCanvas.isDrawingMode) {
					self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
					self.discardSelection(true);
					$(viewer).trigger('disableMovePageTool');
				}
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: true,
				update: function() {
					o.toggleClass('down', self.currentCanvas.isDrawingMode)
				}
			};
		},
		freeDrawBrushSelect: function(o) {
			var ie = uiToolsHelper.getInput(o, 'select');
			ie.on('change input', function() {
				self.state.freeDraw.brush.name = ie.val();
				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush(ie.val());
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode
			};
		},
		freeDrawBrushWidthInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', function() {
				var w = parseInt(ie.val(), 10) || 1;
				self.state.freeDraw.brush.width = w;
				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			});
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					ie.val(self.state.freeDraw.brush.width);
				}
			};
		},
		freeDrawBrushColorInput: function(o) {
			return this.colorInputTool2(o, {
				onChange: uiToolsHelper.change(function(c) {
					var color = tinycolor(c);
					self.state.freeDraw.brush.color = color.toRgbString();
					self.state.freeDraw.brush.opacity = color.getAlpha();
					self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
				}),
				isEnabled: this.isFreeDrawMode,
				currentColor: function() {
					return self.state.freeDraw.brush.color;
				}
			});
		},
		freeDrawOpacityInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', uiToolsHelper.change(function() {
				var opacity = parseFloat(ie.val());
				self.state.freeDraw.brush.opacity = opacity;

				var color = tinycolor(self.state.freeDraw.brush.color);
				color.setAlpha(opacity);
				self.state.freeDraw.brush.color = color.toRgbString();

				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			}));
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					ie.val(self.state.freeDraw.brush.opacity);
				}
			};
		},
		freeDrawOpacitySelect: function(o) {
			var ie = uiToolsHelper.getInput(o, 'select');
			ie.on('change', uiToolsHelper.change(function() {
				var opacity = parseInt(ie.val()) / 100.0;
				self.state.freeDraw.brush.opacity = opacity;

				var color = tinycolor(self.state.freeDraw.brush.color);
				color.setAlpha(opacity);
				self.state.freeDraw.brush.color = color.toRgbString();

				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			}));
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					var v = Math.round(self.state.freeDraw.brush.opacity * 10) * 10;
					ie.val('' + v);
				}
			};
		},
		freeDrawBrushShadowWidthInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', function() {
				var w = parseInt(ie.val()) || 0;
				self.state.freeDraw.brush.shadow.width = w;
				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			});
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					ie.val(self.state.freeDraw.brush.shadow.width);
				}
			};
		},
		freeDrawBrushShadowColorInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', function() {
				self.state.freeDraw.brush.shadow.color = ie.val();
				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			});
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					ie.val(self.state.freeDraw.brush.shadow.color);
				}
			};
		},
		freeDrawBrushShadowOffsetInput: function(o) {
			var ie = uiToolsHelper.getInput(o, 'input');
			ie.on('change input', function() {
				var off = parseInt(ie.val()) || 0;
				self.state.freeDraw.brush.shadow.offset = off;
				self.currentCanvas.freeDrawingBrush = createFreeDrawBrush();
			});
			uiToolsHelper.changeOnEnter(ie);
			return {
				obj: o,
				isEnabled: this.isFreeDrawMode,
				update: function() {
					ie.val(self.state.freeDraw.brush.shadow.offset);
				}
			};
		},
		freeDrawLineModeButton: function(o, modeName) {
			var isFreeDrawMode = this.isFreeDrawMode;
			o.on('click', function() {
				self.state.freeDraw.lineMode = modeName;
				self.updateUiTools();
			});
			return {
				obj: o,
				isEnabled: function() {
					return isFreeDrawMode() &&
						self.state.freeDraw.brush.name == 'PencilBrush';
				},
				update: function() {
					o.toggleClass('down', self.state.freeDraw.lineMode == modeName)
				}
			};
		},
		freeDrawStraightLineModeButton: function(o) {
			return this.freeDrawLineModeButton(o, 'straight');
		},
		freeDrawFreeLineModeButton: function(o) {
			return this.freeDrawLineModeButton(o, 'free');
		},
		popperToggle: function(o) {
			var popperId = o.data('popperId');
			var popup = $('#' + popperId);
			var reference = o;
			var popper = new Popper(reference[0], popup[0], {
				placement: 'bottom-end',
				modifiers: {
					flip: {
						behavior: ['bottom', 'bottom-start', 'bottom-end']
					},
					preventOverflow: true
				}
			});
			var toggle = function(v) {
				if(v === undefined) {
					popup.toggle();
				} else if (v) {
					popup.show();
				} else {
					popup.hide();
				}
				o.toggleClass('down', popup.is(':visible'));
			};

			reference.data('popper', popper);

			setInterval(function() {
				if(popup.is(':visible')) {
					popper.update();
				}
			}, 200);

			$(document).on('mouseup', function(e) {
				var inPopper = jQuery.contains(popup[0], e.target) || popup[0] == e.target;
				if(inPopper) {
					return;
				}
				var inTool = jQuery.contains(o[0], e.target);
				if(!inTool) {
					toggle(false);
				}
			});

			o.on('click', function(e) {
				e.preventDefault();
				reference.data('popper').update();
				toggle();
			});

			return {
				obj: o,
				group: true,
				isEnabled: function() {
					return popup.find('[data-role]:not(.disabled)').length > 0;
				},
				update: function() {
					toggle(false);
				}
			};
		}
	};

	self.updateUiTools = function() {
		if(!self.currentCanvas) {
			for(var i=0; i<self.uiTools.length; i++) {
				self.uiTools[i].obj.toggleClass('disabled', true);
			}
			return;
		}
		viewer.doUpdateUiTools(self.uiTools);
	};

	self.bindTools = function(selector) {
		$(selector).each(function() {
			var o = $(this);
			var role = o.data('role');
			if(role && uiTools[role]) {
				var tool = uiTools[role](o);
				if(tool) {
					self.uiTools.push(tool);
				}
			}
		});
		self.updateUiTools();
	};

	$(viewer).on('beforePageClear', function(ev, p) {
		self.savePageState();
		if(self.currentCanvas) {
			 self.currentCanvas.dispose();
			 self.currentCanvas = null;
		}
		self.undo.clear();
	});

	$(viewer).on('movePageToolToggle', function(ev, p) {
		if(self.currentCanvas) {
			self.currentCanvas.selection = !p;
			self.currentCanvas.allowTouchScrolling = p;
			if(p) {
				self.currentCanvas.isDrawingMode = false;
				self.discardSelection(true);
				self.updateUiTools();
			}
			self.currentCanvas.defaultCursor = p ? 'grabbing' : 'default';
		}
	});

	$(viewer).on('pageShown', function(ev, p) {
		// overlay page with canvas
		var canvas = document.createElement('canvas');
		canvas.height = p.wrapper.height();
		canvas.width = p.wrapper.width();
		$(canvas).attr('id', 'pageCanvasOverlay');
		p.wrapper.append(canvas);

		// create fabric canvas for that overlay
		var fabricCanvas = new fabric.Canvas('pageCanvasOverlay', {
			allowTouchScrolling : true
		});
		fabricCanvas.selection = !viewer.isMovePageMode;
		fabricCanvas.allowTouchScrolling = viewer.isMovePageMode;
		self.currentCanvas = fabricCanvas;
		window.fabricCanvas = fabricCanvas;

		$(canvas).parent().css('position', 'absolute').css('top', '0').css('left', '0');

		// import fabric page objects
		self.restorePageState(p.pageNum, function() {
			self.undo.push();
		});

		// add keyboard events
		var eventTarget = $('#pageCanvasOverlay').parent()[0];
		eventTarget.tabIndex = 1000;
		eventTarget.addEventListener('keydown', self.keyEventHandler, false);

		// tools state update
		self.updateUiTools();
		var uiToolsUpdate = self.updateUiTools.bind(self);
		fabricCanvas.on('mouse:down', uiToolsUpdate);
		fabricCanvas.on('mouse:up', uiToolsUpdate);
		fabricCanvas.on('mouse:move', function(e) {
			fabricCanvas.defaultCursor = viewer.isMovePageMode ? 'grabbing' : 'default';
		});
		fabricCanvas.on('selection:created', uiToolsUpdate);
		fabricCanvas.on('selection:cleared', uiToolsUpdate);
		fabricCanvas.on('object:modified', uiToolsUpdate);
		fabricCanvas.on('object:selected', function(e) {
			$(viewer).trigger('disableMovePageTool');
			uiToolsUpdate();
		});
		fabricCanvas.on('object:removed', uiToolsUpdate);
		fabricCanvas.on('object:added', uiToolsUpdate);

		var upperCanvas = $('#pageCanvasOverlay').parent().find('.upper-canvas')[0];
		viewer.bindHandTool(upperCanvas);

		// Undo redo
		var undoPush = self.undo.push.bind(self.undo);
		fabricCanvas.on("object:modified", undoPush);
		fabricCanvas.on("object:removed", undoPush);
		fabricCanvas.on("object:added", function() {
			if(uiTools.isFreeDrawMode()) {
				undoPush();
			}
		});


		$(".pageCanvasWrapper").on("click", function(e) {
	    	//alert("parent click");
	      if(self.currentCanvas.getActiveObject() != null){
	        $('.canvas-container').css('pointer-events','all')

	        //$('.canvas-container').css('z-index','10')
	        //$('#bg_div').css('z-index','0')
	      } else {

	        $('.canvas-container').css('pointer-events','none')
	        //$('#bg_div').css('z-index','10')
	        //$('.canvas-container').css('z-index','0')

	        var obj = self.currentCanvas.findTarget(e,true);
	        if(obj != null){
	            $('.canvas-container').css('pointer-events','all')
	            //$('.canvas-container').css('z-index','10')
	            //$('#bg_div').css('z-index','0')
	            self.currentCanvas.setActiveObject(obj);
	            self.currentCanvas.requestRenderAll();
	        }
	      }
	  });
		fabricCanvas.on({
		    'object:selected': selectedObject,
				'selection:cleared': deSelectedObject
		});
		function selectedObject(e) {
				$('.canvas-container').css('pointer-events','all');
				console.log("selected");
		}
		function deSelectedObject(e) {
				console.log("deselected");
				$('.canvas-container').css('pointer-events','none');
		}

		$('.textLayer div').on('click', function(e) {
			var obj = self.currentCanvas.findTarget(e,true);
			if(obj != null){
				return;
			}
			self.handleEditing(this, e);
			//alert($(this).text());
		});

	});

	self.handleEditing = function(div){
		//debugger;
		if(self.currentCanvas.getActiveObject() != null){
			return;
		}
		var currentElement = $(div);
		var width = parseFloat(currentElement.css('width').replace('px', ''));
		var fontSize = parseFloat(currentElement.css('font-size').replace('px', ''));
		var dataAscent = parseFloat(currentElement.attr('data-ascent'));

		var fontFamily = currentElement.css('font-family');
		var color = currentElement.attr('data-font-color');

		var height = currentElement.height();
		var position = currentElement.position();


		var textTemp = new fabric.Text(currentElement.text(), {
		  left: position.left,
		  top: position.top-(dataAscent*4),
		  //width: width,
			//fixedWidth: width,
			//height: height,
		  fontSize: fontSize,
			fill: color,
			fontFamily: fontFamily,
		});
		//self.currentCanvas.add(textTemp).setActiveObject(textTemp);
		var newWidth = textTemp.width;
		//self.currentCanvas.remove(textTemp);

		var textbox = new fabric.Textbox(currentElement.text(), {
		  left: position.left,
		  top: position.top-(dataAscent*4),
		  width: newWidth+2,
			//fixedWidth: width,
			//height: height,
		  fontSize: fontSize,
			fill: color,
			fontFamily: fontFamily,
		});
		// textbox.set("minWidth",width);
		// textbox.set("min-width",width);
		// textbox.set("height",height);

		//textbox.set("fontFamily", fontFamily);
		self.currentCanvas.add(textbox).setActiveObject(textbox);
		//self.loadAndUse(fontFamily);

		//var bgColor = "fff";
		//try{
			//var dataFont = currentElement.attr('data-font');
			//bgColor = dataFont.split("+")[0];

			currentElement.addClass("edited");
			var bgColor = self.getDivBGColor(position,width,height);
			currentElement.css({"background-color":bgColor,"outline-color":bgColor, "outline": "1px solid "+bgColor });

		//}catch(e){}
	}

	self.loadAndUse = function(font) {
	  var myfont = new FontFaceObserver(font)
	  myfont.load()
	    .then(function() {
	      // when font is loaded, use it.
	      self.currentCanvas.getActiveObject().set("fontFamily", font);
	      self.currentCanvas.requestRenderAll();
	    }).catch(function(e) {
	      console.log(e)
	      alert('font loading failed ' + font);
	    });
		}

	self.getDivBGColor = function(position, width, height){
		var context = $("#pdf_canvas")[0].getContext('2d');
		var image = context.getImageData(position.left, position.top, width, height);
		// Loop over each pixel and invert the color.
		var colorsMap = {};
		for (var i = 0; i < image.data.length; i += 4) {
		    r = image.data[i];
        g = image.data[i + 1];
        b = image.data[i + 2];
        a = image.data[i + 3]; // alpha

				if( colorsMap["rgb("+r+"," + g + "," + b + ")"] ){
					colorsMap["rgb("+r+"," + g + "," + b + ")"] += 1;
				} else {
					colorsMap["rgb("+r+"," + g + "," + b + ")"] = 1;
				}
		}


		var keys = Object.keys(colorsMap);
		//var min = keys[0]; // ignoring case of empty list for conciseness
		var max = keys[0];
		//var maxColor;
		var i;

		for (i = 0; i < keys.length; i++) {
		    var value = keys[i];
		    if (colorsMap[value] > colorsMap[max]){
					max = value;
				}
		}
		return max;
	}


}
