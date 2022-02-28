////////////////////////////////////////////////////////////////////
// Array
////////////////////////////////////////////////////////////////////
if(!Array.prototype.contains) {
	Object.defineProperty(Array.prototype, 'contains', {
		enumerable: false,
		writable: true,
		value: function(obj) {
			var i = this.length;
			while (i--) {
				if (this[i] === obj) {
					return true;
				}
			}
			return false;
		}
	});
}

if(!Array.prototype.indexOf) {
	Object.defineProperty(Array.prototype, 'indexOf', {
		enumerable: false,
		writable: true,
		value: function(what, i) {
			i = i || 0;
			var L = this.length;
			while(i < L) {
				if(this[i] === what) return i;
				++i;
			}
			return -1;
		}
	});
}

if(!Array.prototype.lastIndexOf) {
	Object.defineProperty(Array.prototype, 'lastIndexOf', {
		enumerable: false,
		writable: true,
		value: function(what, i) {
			var L = this.length;
			i= i || L-1;
			if(isNaN(i) || i >= L) i = L-1;
			else if(i< 0) i += L;
			while(i> -1){
				if(this[i] === what) return i;
				--i;
			}
			return -1;
		}
	});
}

if (!Array.prototype.forEach) {
	Object.defineProperty(Array.prototype, 'forEach', {
		enumerable: false,
		writable: true,
		value: function(callback, thisArg) {
			thisArg = thisArg || this;
			for (var i = 0; i < this.length; i++) {
				callback.call(thisArg, this[i], i, this);
			}
		}
	});
}

if (!Array.prototype.last) {
	Object.defineProperty(Array.prototype, 'last', {
		enumerable: false,
		writable: true,
		value: function() {
			return this[this.length - 1];
		}
	});
}


////////////////////////////////////////////////////////////////////
// Object
////////////////////////////////////////////////////////////////////
if (!Object.prototype.forEach) {
	Object.defineProperty(Object.prototype, 'forEach', {
		enumerable: false,
		writable: true,
		value: function(callback, thisArg) {
			thisArg = thisArg || this;
			for (var key in this) {
				if (this.hasOwnProperty(key)) {
					callback.call(thisArg, key, this[key], this);
				}
			}
		}
	});
}


////////////////////////////////////////////////////////////////////
// String
////////////////////////////////////////////////////////////////////
if(!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

if(!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(search, replace) {
		var str = this;
		while(str.indexOf(search) != -1) {
			str = str.replace(search, replace);
		}
		return str;
	};
}

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function (suffix) {
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
}

if(!String.prototype.startsWith){
	String.prototype.startsWith = function (str) {
		return !this.indexOf(str);
	};
}


////////////////////////////////////////////////////////////////////
// console
////////////////////////////////////////////////////////////////////
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function () { };
if (!window.console.warn) window.console.warn = function () { };
if (!window.console.error) window.console.error = function () { };


////////////////////////////////////////////////////////////////////
// jquery extensions
////////////////////////////////////////////////////////////////////
(function($) {
	var hiddenCheck = function($s) {
		return $s.each(function() {
			var $e = $(this);
			if($e.hasClass('hidden')) {
				if($e.css('display') !== 'none') {
					this.style.display = 'none';
					console.warn('Element was still visible, hidden by inline style', this);
				}
			} else {
				var displayVal = this.style.display;
				if(displayVal && displayVal === 'none') {
					this.style.display = '';
					console.warn('Element was still hidden by inline style, inline style removed', this);
				}
			}
		});
	};

	$.fn.addHidden = function() {
		this.addClass('hidden');
		return hiddenCheck(this);
	}

	$.fn.removeHidden = function() {
		this.removeClass('hidden');
		return hiddenCheck(this);
	}

	$.fn.toggleHidden = function(isHidden) {
		if(typeof isHidden == 'undefined') {
			this.toggleClass('hidden');
		} else {
			this.toggleClass('hidden', isHidden);
		}
		return hiddenCheck(this);
	}

	$.fn.isInViewport = function() {
		var elementTop = $(this).offset().top;
		var elementBottom = elementTop + $(this).outerHeight();

		var viewportTop = $(window).scrollTop();
		var viewportBottom = viewportTop + $(window).height();

		return elementBottom > viewportTop && elementTop < viewportBottom;
	};

	$.fn.center = function() {
		var vis = this.css('visibility');
		this.css('visibility', 'hidden');

		this.css('position', 'absolute');
		this.css("top", "0px");
	    this.css("left", '0px');

		var ph = $(this).parent().height();
		var pw = $(this).parent().width();

		var h = $(this).outerHeight(true);
		var w = $(this).outerWidth(true);

		var top = Math.max(0, Math.round((ph - h) / 2));
		var left = Math.max(0, Math.round((pw - w) / 2));

	    this.css("top", top + "px");
	    this.css("left", left + 'px');
		this.css('visibility', vis);

	    return this;
	}
}(jQuery));


////////////////////////////////////////////////////////////////////
// utilz object
////////////////////////////////////////////////////////////////////
(function(exportsName) {
	var exports = {};

	////////////////////////////////////////////////////////////////////

	var waitUntilDomReady = function(callback) {
		var check = function() {
			if(document.readyState === "complete") {
				callback();
			} else {
				setTimeout(function() {
					check();
				});
			}
		};
		setTimeout(check);
	};

	exports.waitUntilDomReady = waitUntilDomReady;

	////////////////////////////////////////////////////////////////////

	var LayerWindow = function(windowData) {
		this.prev = false;
		this.maximize = false;
		this.closeable = true;
		this.closedByUser = false;
		this.bottomLayerMode = 'div';
		this.windowStyle = '';
		this.titleStyle = '';
		this.closeStyle = '';
		this.bodyStyle = '';

		if(windowData && windowData instanceof Object) {
			this.data = windowData.data;
			this.closeable = typeof windowData.closeable == 'undefined' ? true : windowData.closeable;
			this.maximize = typeof windowData.maximize == 'undefined' ? false : windowData.maximize;
			this.bottomLayerMode = windowData.bottomLayerMode ? windowData.bottomLayerMode : 'div';
			this.windowStyle = windowData.windowStyle || '';
			this.titleStyle = windowData.titleStyle || '';
			this.closeStyle = windowData.closeStyle || '';
			this.bodyStyle = windowData.bodyStyle || '';
			this.addCloseCallback(windowData.onClose);
		} else {
			this.data = windowData;
		}
	};

	LayerWindow.closeCurrent = function(closedByUser) {
		if(LayerWindow.current) {
			LayerWindow.current.close(closedByUser);
		}
	};

	LayerWindow.closeAll = function(closedByUser) {
		while(LayerWindow.current) {
			LayerWindow.current.close(closedByUser);
		}
	};

	LayerWindow.extractTitle = function(data) {
		var title = '';
		var erg = data.match(/<title>([\s\S]*?)<\/title>/i);
		if(erg) {
			title = erg[1].trim();
		}
		return title;
	};

	LayerWindow.extractBody = function(data) {
		var body = '';
		var m = data.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
		if(m) {
			var attribs = m[1].trim();
			if(attribs) {
				body = m[0].trim();
				body = body.replace(new RegExp('^<body', 'i'), '<div');
				body = body.replace(new RegExp('body>$', 'i'), 'div>');
			} else {
				body = m[2].trim();
			}
		}
		return body;
	};

	LayerWindow.prototype.show = function() {
		if(this.node) {
			return;
		}

		if(!LayerWindow.current && LayerWindow.enterWindowMode) {
			LayerWindow.enterWindowMode();
		}

		var self = this;
		var appendLayerWindow = function() {
			var title = LayerWindow.extractTitle(self.data);
			var bodyContent = LayerWindow.extractBody(self.data);
			if(!title && !bodyContent) {
				bodyContent = self.data;
			}

			var windowStyle = 'visibility:hidden;';
			windowStyle += (self.maximize ? 'height:100%; width:100%;' : '');
			windowStyle += self.windowStyle;

			var html = '<div class="layerWindow" style="'+ windowStyle +'">';
			if(title) {
				html += '<div class="layerWindowHead">';
				var titleStyle = 'float:left;' + self.titleStyle;
				html += '<div class="layerWindowTitle" style="'+titleStyle+'">'+ title +'</div>';
				if(self.closeable) {
					var closeStyle = 'float:right;' + self.closeStyle;
					html += '<div class="layerWindowClose" style="'+ closeStyle +'">';
					html += '<a href="javascript:LayerWindow.closeCurrent(true)">×</a>';
					html += '</div>';
				}
				html += '</div>';
				var bodyStyle = 'clear:both;' + self.bodyStyle;
				html += '<div class="layerWindowBody" style="'+ bodyStyle +'">';
				html += bodyContent;
				html += '</div>';
			} else {
				var bodyStyle = '' + self.bodyStyle;
				html += '<div class="layerWindowBody noTitle" style="'+ bodyStyle +'">' + bodyContent + '</div>';
			}
			html += '<div>';

			self.node = $(html);
			self.node.appendTo('body');
			self.node.focus();

			//set current
			if(LayerWindow.current) {
				LayerWindow.current.node.hide();
				LayerWindow.current.bottomLayer.hide();
				self.prev = LayerWindow.current;
			}
			LayerWindow.current = self;
		};

		var appendBottomLayer = function() {
			if(self.bottomLayerMode == 'iframe') {
				var temp = $('<div class="layerWindowBottomLayer" style="display:none;"></div>');
				temp.appendTo('body');
				var bg = temp.css('background-color') || '#CCC';
				temp.remove();

				var iframe = self.bottomLayer = $('<iframe class="layerWindowBottomLayer" frameborder="0"></iframe>');
				iframe.appendTo('body');

				iframe.ready(function() {
					var wd = iframe[0].contentDocument || iframe[0].contentWindow.document;
					if(wd) {
						wd.open();
						wd.write('<body style="margin:0;padding:0;background-color:'+ bg +';width:100%;height:100%;"></body>');
						wd.close();
					}
				});
			} else {
				self.bottomLayer = $('<div class="layerWindowBottomLayer"></div>');
				self.bottomLayer.appendTo('body');
			}
		};

		appendBottomLayer();
		appendLayerWindow();

		var checker = function() {
			if(self.closed) {
				$(window).unbind('resize', checker);
				$(window).unbind('scroll', checker);
				clearInterval(self.checkInterval);
				return;
			}
			if(LayerWindow.current && LayerWindow.current != self) {
				return;
			}

			var win = self.node;
			var bodyWrapper = self.node.find('.layerWindowBodyWrapper').eq(0);
			var body = self.node.find('.layerWindowBody').eq(0);
			var bodyWidth = Math.ceil(body[0].scrollWidth);
			var bodyHeight = Math.ceil(body[0].scrollHeight);
			var maxBodyHeight = $(window).height() - (win.outerHeight() - body.outerHeight()) - 3;
			var maxBodyWidth = $(window).width() - (win.outerWidth() - body.outerWidth()) - 3;

			body.css({
				maxHeight : maxBodyHeight + 'px',
				maxWidth : maxBodyWidth + 'px',
				overflowY : bodyHeight > maxBodyHeight ? 'scroll' : 'visible',
				overflowX : bodyWidth > maxBodyWidth ? 'scroll' : 'visible'
			});

			var posX = Math.floor(($(window).width() - win.outerWidth()) / 2);
			var posY = Math.floor(($(window).height() - win.outerHeight()) / 2);
			win.css({
				left : (posX < 0 ? 0 : posX) + $(window).scrollLeft() + 'px',
				top : (posY < 0 ? 0 : posY) + $(window).scrollTop() + 'px'
			});

			if(win.css('visibility') == 'hidden') {
				win.css('visibility', 'visible');
			}

			self.bottomLayer.css('top', $(window).scrollTop() + 'px');
			self.bottomLayer.css('left', $(window).scrollLeft() + 'px');
		};
		waitUntilDomReady(function() {
			checker();
			self.checkInterval = setInterval(checker, 500);
			$(window).resize(checker);
			$(window).scroll(checker);
		});

		//add close handler
		this.closeHandler = function(e) {
			if (e.keyCode == 27 && self.node && LayerWindow.current == self) {
				LayerWindow.closeCurrent(true);
			}
		};
		$(document).keyup(this.closeHandler);
	};

	LayerWindow.show = function(data) {
		var w = new LayerWindow(data);
		w.show();
		return w;
	};

	LayerWindow.prototype.close = function(closedByUser) {
		if(!this.node) {
			return;
		}

		this.closed = true;
		this.closedByUser = closedByUser || false;

		$(window).unbind('keyup', this.closeHandler);

		this.bottomLayer.remove();
		this.node.remove();

		LayerWindow.current = this.prev;

		var leaveWM = LayerWindow.current ? false : true;

		if(this.closeCallbacks) {
			for(var i=0; i < this.closeCallbacks.length; i++) {
				this.closeCallbacks[i](this);
			}
		}

		if(LayerWindow.current && LayerWindow.current == this.prev) {
			LayerWindow.current.node.show();
			LayerWindow.current.bottomLayer.show();
		}

		if(leaveWM && LayerWindow.leaveWindowMode) {
			LayerWindow.leaveWindowMode();
		}
	};

	LayerWindow.showInfo = function(data) {
		var title = data.title || '';
		var content = data.content || '';
		var width = data.width || '500px';
		var margin = data.margin || '10px';

		var style = '';
		style += ';width:'+width;
		style += ';margin:'+margin;

		content = '<div style="'+style+'">'+content+'</div>';

		var okbtn = '<div style="margin:10px; text-align:right;">';
			okbtn += '<input type="button" value="Ok" onclick="LayerWindow.closeCurrent(true);">';
		okbtn += '</div>';

		var html = '<title>'+ title +'</title>\n';
		html += '<body>'+ content + okbtn +'</body>';

		var win = new LayerWindow({
			data : html,
			bottomLayerMode : data.bottomLayerMode || 'div',
			windowStyle : data.windowStyle || null,
			titleStyle : data.titleStyle || null,
			closeStyle : data.closeStyle || null,
			onClose : data.onClose || null
		});
		win.show();
		return win;
	};

	LayerWindow.prototype.addCloseCallback = function(callback) {
		if(callback) {
			if(typeof callback == 'function') {
				callback = [callback];
			}
			if(callback instanceof Array) {
				if(!this.closeCallbacks) {
					this.closeCallbacks = callback;
				} else {
					this.closeCallbacks.concat(callback);
				}
			}
		}
	};

	LayerWindow.prototype.setBorder = function(border) {
		$(this.node).find('.layerWindow').css('border', border);
	};

	exports.LayerWindow = LayerWindow;

	////////////////////////////////////////////////////////////////////

	var LoadingState = function(data) {
		this.data = data;
		this.isSet = false;
		this.img = new Image();
		if (data.onImgLoad) {
			this.img.onload = data.onImgLoad;
		}
		this.img.src = data.img;
	};

	LoadingState.makeData = function(value) {
		if(typeof value == 'string') {
			if(document.getElementById(value)) {
				return {id:value};
			}
			return {selector:value};
		}
		if(value instanceof jQuery) {
			return {jnode:value};
		}
		if(value.tagName) {
			return {node:value};
		}
		return null;
	};

	LoadingState.set = function(data) {
		var ls = new LoadingState(data);
		ls.show();
		return ls;
	};

	LoadingState.prototype.makeJNode = function() {
		var jnode = null;
		if(this.data) {
			if (this.data.jnode) {
				jnode = this.data.jnode;
			} else if (this.data.node) {
				jnode = $(this.data.node);
			} else if (this.data.id) {
				jnode = $('#' + this.data.id);
			} else if (this.data.selector) {
				jnode = $(this.data.selector);
			}
		}
		return jnode;
	};

	LoadingState.prototype.show = function() {
		if (this.isSet) {
			return;
		}
		this.isSet = true;
		var jnode = this.makeJNode();
		if (jnode) {
			this.old = jnode.html();
			var imgHtml = '<img src="' + this.data.img + '" style="'+ (this.data.imgStyle || '') +'" />';
			if (this.data.keepSize) {
				jnode.html('<div style="width:' + jnode.width() + 'px; text-align:center">'+ imgHtml +'</div>');
			} else {
				jnode.html(imgHtml);
			}
		}
	};

	LoadingState.prototype.reset = function() {
		this.isSet = false;
		var jnode = this.makeJNode();
		if (jnode) {
			jnode.html(this.old || '');
			this.old = null;
		}
	};

	exports.LoadingState = LoadingState;

	////////////////////////////////////////////////////////////////////

	var isValidEmailAddr = exports.isValidEmail = function(email) {
		var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z0-9]+)$/;
		return reg.test(email.trim());
	};

	exports.isValidEmailAddr = isValidEmailAddr;
	exports.isValidEmailAddress = isValidEmailAddr;
	exports.isValidEmail = isValidEmailAddr;

	////////////////////////////////////////////////////////////////////

	var isValidEmailAddrList = function(emailList) {
		emailList = emailList.replaceAll(',',';');
		emailList = emailList.split(';');
		for(var i = 0; i < emailList.length; i++) {
			if(!isValidEmailAddr(emailList[i])) {
				return false;
			}
		}
		return emailList.length > 0;
	};

	exports.isValidEmailAddrList = isValidEmailAddrList;
	exports.isValidEmailAddressList = isValidEmailAddrList;
	exports.isValidEmailList = isValidEmailAddrList;

	////////////////////////////////////////////////////////////////////

	var decodeHtmlSpecialChars = function(str) {
		str = str.replace('&amp;','&');
		str = str.replace('&quot;','"');
		str = str.replace('&#039;',"'");
		str = str.replace('&lt;','<');
		str = str.replace('&gt;','>');
		return str;
	}

	exports.decodeHtmlSpecialChars = decodeHtmlSpecialChars;

	////////////////////////////////////////////////////////////////////

	var getQueryParam = function(name, def, url) {
		url = url || window.location.href;
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("([?&])" + name + "(=([^&#]*))?");
		var results = regex.exec(url);
		if(results) {
			if(results[3] == undefined) {
				return "";
			}
			return decodeURIComponent(results[3].replace(/\+/g, " "));
		}
		return def;
	};

	exports.getQueryParam = getQueryParam;

	////////////////////////////////////////////////////////////////////

	var getHashParam = function(name, def, url) {
		url = url || window.location.href;
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regex = new RegExp("(([#&])|#!)" + name + "(=([^&]*))?");
		var results = regex.exec(url);
		if(results) {
			if(results[4] == undefined) {
				return "";
			}
			return decodeURIComponent(results[4].replace(/\+/g, " "));
		}
		return def;
	};

	exports.getHashParam = getHashParam;

	////////////////////////////////////////////////////////////////////

	var getUrlParam = function(name, def, url) {
		url = url || window.location.href;
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regex = new RegExp("([?&#]|#!)"+ name +"(=([^&#]*))?");
		var results = regex.exec(url);
		if(results) {
			if(results[3] == undefined) {
				return "";
			}
			return decodeURIComponent(results[3].replace(/\+/g, " "));
		}
		return def;
	};

	exports.getUrlParam = getUrlParam;

	////////////////////////////////////////////////////////////////////

	var addQueryParam = function(url, key, val) {
		var parts = url.match(/([^?#]+)(\?[^#]*)?(\#.*)?/);
		var url = parts[1];
		var qs = parts[2] || '';
		var hash = parts[3] || '';

		if ( !qs ) {
			return url + '?' + key + '=' + encodeURIComponent(val) + hash;
		}

		var qs_parts = qs.substr(1).split("&");
		var i;
		for (i=0;i<qs_parts.length;i++) {
			var qs_pair = qs_parts[i].split("=");
			if ( qs_pair[0] == key ){
				qs_parts[ i ] = key + '=' + encodeURIComponent( val );
				break;
			}
		}
		if (i == qs_parts.length) {
			qs_parts.push(key + '=' + encodeURIComponent(val));
		}

		return url + '?' + qs_parts.join('&') + hash;
	};

	exports.addQueryParam = addQueryParam;

	////////////////////////////////////////////////////////////////////

	var removeUrlParams = function(url, args) {
		if(typeof args == 'string') {
			args = args.split(',');
		}
		for(var i=0; i<args.length; i++) {
			args[i] = args[i].trim();

			var patt1 = new RegExp('&'+ args[i] +'(=[^&]*)?', 'g');
			url = url.replace(patt1, '');

			var patt2 = new RegExp('\\?'+ args[i] +'(=[^&]*&?)?', 'g');
			url = url.replace(patt2, '?');

			var patt3 = new RegExp('#'+ args[i] +'(=[^&]*&?)?', 'g');
			url = url.replace(patt3, '#');

			var patt3 = new RegExp('#!'+ args[i] +'(=[^&]*&?)?', 'g');
			url = url.replace(patt3, '#!');
		}
		if(url.endsWith('?') || url.endsWith('#')) {
			url = url.substring(0, url.length - 1);
		} else if(url.endsWith('#!')) {
			url = url.substring(0, url.length - 2);
		}
		return url;
	};

	exports.removeUrlParams = removeUrlParams;
	exports.removeUrlArgs = removeUrlParams;

	////////////////////////////////////////////////////////////////////

	var ImgLoader = function(imgSources, callback) {
		if(!(imgSources instanceof Array)) {
			imgSources = [imgSources];
		}
		var callbackCalled = false;
		var counter = imgSources.length;
		var timeout = window.setTimeout(function() {
			if(!callbackCalled) {
				callbackCalled = true;
				if(callback) {
					callback();
				}
			}
		}, imgSources.length * 500);
		for(var i = 0; i < imgSources.length; i++) {
			var imgSrc = imgSources[i];
			var lockImg = new Image(1,1);
			lockImg.onload = function() {
				if(--counter == 0) {
					window.clearTimeout(timeout);
					if(!callbackCalled) {
						callbackCalled = true;
						if(callback) {
							callback();
						}
					}
				}
			};
			lockImg.src = imgSrc;
		}
		return false;
	};

	exports.ImgLoader = ImgLoader;

	////////////////////////////////////////////////////////////////////

	var imgTrackData = {};

	var imgTrack = function(imgSources, arg2) {
		// object for completed images
		if(!imgTrackData.imagesComlete) {
			imgTrackData.imagesComlete = {};
		}

		// handler used if all images are loaded
		var doArg2 = function() {
			if(!doArg2.done) {
				doArg2.done = true;
				if (typeof(arg2) == "function") {
					arg2();
				} else {
					location.href = arg2;
				}
			}
		};

		// force an array
		if(!(imgSources instanceof Array)) {
			imgSources = [imgSources];
		}

		// calculate remaining images to load
		var remaining = 0;
		for(var i = 0; i < imgSources.length; i++) {
			if(!imgTrackData.imagesComlete[imgSources[i]]) {
				remaining += 1;
			}
		}
		if(remaining == 0) {
			doArg2();
			return;
		}

		// timeout if something is broken
		var timeout = window.setTimeout(doArg2, imgSources.length * 500);

		// load the images
		var counter = new Object();
		counter.value = remaining;
		for(var i = 0; i < imgSources.length; i++) {
			var imgSrc = imgSources[i];
			if(imgTrackData.imagesComlete[imgSrc]) {
				continue;
			}

			var img = new Image(1,1);
			img.onload = function() {
				imgTrackData.imagesComlete[imgSrc] = 1;
				if(--counter.value == 0) {
					window.clearTimeout(timeout);
					doArg2();
				}
			}
			img.src = imgSrc;
		}
	};

	exports.imgTrack = imgTrack;

	////////////////////////////////////////////////////////////////////

	var compareVersionNumbers = function(strV1, strV2) {
		var nRes = 0
		  , parts1 = strV1.split('.')
		  , parts2 = strV2.split('.')
		  , nLen = Math.max(parts1.length, parts2.length);

		for (var i = 0; i < nLen; i++) {
			var nP1 = (i < parts1.length) ? parseInt(parts1[i], 10) : 0
			  , nP2 = (i < parts2.length) ? parseInt(parts2[i], 10) : 0;

			if (isNaN(nP1)) { nP1 = 0; }
			if (isNaN(nP2)) { nP2 = 0; }

			if (nP1 != nP2) {
				nRes = (nP1 > nP2) ? 1 : -1;
				break;
			}
		}
		return nRes;
	};

	exports.compareVersionNumbers = compareVersionNumbers;
	exports.cmpVersions = compareVersionNumbers;

	////////////////////////////////////////////////////////////////////

	var formatError = function(err) {
		if(err.error) {
			return formatError(err.error);
		}

		if(err.code && err.message != undefined) {
			var code = err.code;

			var msg = err.message;
			msg = msg.replace('\r\n', '<br />');
			msg = msg.replace('\n', '<br />');

			var out = '<div class="error">';
				out += '<div class="code">'+ code +'</div>';
				out += '<div class="message">'+ msg +'</div>';
			out += '</div>';
			return out;
		}

		if(typeof(err) == 'string') {
			return err;
		}

		return err;
	};

	exports.formatError = formatError;

	////////////////////////////////////////////////////////////////////

	var openPopupCentered = function(url, name, w, h) {
		var left = (screen.width - w) /2;
		var top = (screen.height - h) / 4;
		var flags = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no';
		//flags += ', width='+w+', height='+h+', top='+top+', left='+left;
		flags += ', width='+w+', height='+h;
		return window.open(url, name, flags);
	};

	exports.openPopupCentered = openPopupCentered;

	////////////////////////////////////////////////////////////////////

	var getDomainOfUrl = function(url) {
		var a = document.createElement('a');
		a.href = url;
		return a.hostname;
	};

	exports.getDomainOfUrl = getDomainOfUrl;
	exports.getDomainFromUrl = getDomainOfUrl;
	exports.getHostnameOfUrl = getDomainOfUrl;

	////////////////////////////////////////////////////////////////////

	var copyToClipboard = function(text) {
		if (window.clipboardData && window.clipboardData.setData) {
			// IE specific code path to prevent textarea being shown while dialog is visible.
			return clipboardData.setData("Text", text);
		}

		if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
			var textarea = document.createElement("textarea");
			textarea.textContent = text;
			textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
			document.body.appendChild(textarea);
			textarea.select();
			try {
				return document.execCommand("copy");  // Security exception may be thrown by some browsers.
			} catch (ex) {
				console.warn("Copy to clipboard failed.", ex);
				return false;
			} finally {
				document.body.removeChild(textarea);
			}
		}
	};

	exports.copyToClipboard = copyToClipboard;

	////////////////////////////////////////////////////////////////////

	var formatSize = function(size) {
		if(size >= 1024 * 1024) {
			return (size / 1024.0 / 1024.0).toFixed(2) + ' MB';
		}
		if(size >= 1024) {
			return (size / 1024.0).toFixed(2) + ' KB';
		}
		return size + ' B';
	};

	exports.formatSize = formatSize;

	////////////////////////////////////////////////////////////////////

	var dblClickProtectState = {};
	var dblClickProtect = function(key, timeout) {
		timeout = timeout || 1000;
		var last = dblClickProtectState[key] || null;
		var currTime = new Date().getTime();
		if(last && currTime - last < timeout) {
			return false;
		}
		dblClickProtectState[key] = currTime;
		return true;
	};

	exports.dblClickProtect = dblClickProtect;

	////////////////////////////////////////////////////////////////////

	var createQueue = function() {
		var queue = {
			data: [],
			add: function(v) {
				this.data.push(v);
			},
			remove: function(v) {
				var newData = [];
				for(var i=0; i<this.data.size; i++) {
					if(this.data[i] != v) {
						newData.push(data.files[i]);
					}
				}
				this.data = newData;
			},
			isEmpty: function() {
				return this.data.length == 0;
			}
		};
		return queue;
	};

	exports.createQueue = createQueue;

	////////////////////////////////////////////////////////////////////

	var isMobile = function() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
	};

	exports.isMobile = isMobile;

	////////////////////////////////////////////////////////////////////

	var isPlainObject = function(e) {
		return "object" == typeof e && null !== e && e.constructor == Object
	};

	exports.isPlainObject = isPlainObject;

	////////////////////////////////////////////////////////////////////

	var once = function(func) {
		var wrapper = function() {
			func && func.apply(this, arguments);
			func = null;
			wrapper.called = true;
		};
		wrapper.called = false;
		return wrapper;
	};

	exports.once = once;

	////////////////////////////////////////////////////////////////////

	var currentTimeMs = function() {
		return (new Date()).getTime();
	};

	exports.currentTimeMs = currentTimeMs;

	////////////////////////////////////////////////////////////////////

	var requireScript = function(conf) {
		var callback = once(conf.callback || function() {});

		if(conf.loadCheck()) {
			callback();
			return;
		}

		var scripts = conf.scripts || [conf.script];
		for(var i=0; i<scripts.length; i++) {
			var script = scripts[i];
			script.id = script.id || script.src.replace('/','-');
			if(!document.getElementById(script.id)) {
				var element = $('<script>');
				element.attr('type', 'text/javascript');
				element.attr('id', script.id);
				var attribs = script.attribs || {};
				for (var k in attribs) {
					if(attribs.hasOwnProperty(k)) {
						element.attr(k, attribs[k]);
					}
				}
				element.attr('async', 'async');
				element.on('load', function() {
					if(conf.loadCheck()) {
						callback();
					}
				});
				element.appendTo('body');
				element.attr('src', script.src);
			}
		}

		var interval = setInterval(function() {
			if(conf.loadCheck()) {
				clearInterval(interval);
				callback();
			}
		}, 100);
	};

	exports.requireScript = requireScript;

	////////////////////////////////////////////////////////////////////

	var requireCss = function(conf) {
		conf.callback = conf.callback || function() {};

		var files = conf.files || [conf.file];
		for(var i=0; i<files.length; i++) {
			var file = files[i];
			file.id = file.id || file.src.replace('/','-');
			file.loaded = false;
			if(!document.getElementById(file.id)) {
				var element = $('<link>');
				element.attr('rel', 'stylesheet');
				element.attr('type', 'text/css');
				element.attr('id', file.id);
				element.attr('href', file.src);
				var attribs = file.attribs || {};
				for (var k in attribs) {
					if(attribs.hasOwnProperty(k)) {
						element.attr(k, attribs[k]);
					}
				}
				element.appendTo('body');
			}
		}

		var callback = once(conf.callback);
		var interval = setInterval(function() {
			for(var i=0; i<files.length; i++) {
				var file = files[i];
				if(!file.loaded) {
					try {
						var element = document.getElementById(file.id);
						if(!element.sheet || !element.sheet.cssRules.length) {
							return;
						}
						file.loaded = true;
					} catch (error) {}
				}
			}
			clearInterval(interval);
			callback();
		}, 50);
	};

	exports.requireCss = requireCss;

	////////////////////////////////////////////////////////////////////

	var localStorage = {
		removeItem : function(name) {
			try {
				window.localStorage.removeItem(name);
				return true;
			} catch(e) {
				console.log(e);
			}
			return false;
		},
		setItemString : function(name, item) {
			try {
				if(item == undefined || item == null) {
					item = null;
				}
				if(item && typeof item != 'string' && item.toString && typeof item.toString == 'function') {
					item = item.toString();
				}
				window.localStorage.setItem(name, item);
				return true;
			} catch(e) {
				console.log(e);
			}
			return false;
		},
		setItemObject : function(name, item) {
			try {
				if(item == undefined || item == null) {
					item = null;
				}
				item = JSON.stringify(item);
				return this.setItemString(name, item);
			} catch(e) {
				console.log(e);
			}
			return false;
		},
		getItemString : function(name, def) {
			try {
				var item = window.localStorage.getItem(name);
				if(item != null) {
					return item;
				}
			} catch(e) {
				console.log(e);
			}
			return def;
		},
		getItemObject : function(name, def) {
			try {
				var item = this.getItemString(name, null);
				if(item) {
					return JSON.parse(item);
				}
			} catch(e) {
				console.log(e);
			}
			return def;
		}
	};

	exports.localStorage = localStorage;

	////////////////////////////////////////////////////////////////////

	var actions = {
		items: [],
		add: function(tag, callback, thisArg) {
			actions.items.push({
				tag : tag,
				callback : callback,
				thisArg : thisArg
			});
		},
		trigger: function(tag) {
			var actionArgs = [].slice.apply(arguments);
			actionArgs.shift();

			var items = actions.items.slice();
			for(var i = 0; i < items.length; i++) {
				var item = items[i];
				if(item.tag == tag) {
					item.callback.apply(item.thisArg, actionArgs);
				}
			}
		}
	};

	exports.actions = actions;

	////////////////////////////////////////////////////////////////////

	var openSharePopup = function(id, shareUrl) {
		shareUrl = shareUrl || location.href;

		var urls = {
			'facebook' : 'https://www.facebook.com/sharer/sharer.php?u={url}',
			'twitter' : 'https://twitter.com/intent/tweet?url={url}',
			'linkedIn' : 'https://www.linkedin.com/shareArticle?mini=true&url={url}',
			'googlePlus' : 'https://plus.google.com/share?url={url}',
			'mailTo' : 'mailto:?subject=PDF24 Tools&body={url}'
		};
		var url = urls[id];
		url = url.replace('{url}', encodeURIComponent(shareUrl));

		if(id == 'mailTo') {
			$("#iframeShareMailTo").remove();
			$("<iframe/>").attr({
				id: 'iframeShareMailTo',
				src: url,
				style: "display:none"
			}).appendTo(document.body);
			//window.location = url;
		}
		else {
			openPopupCentered(url, '_blank', 600, 500);
		}
	};

	exports.openSharePopup = openSharePopup;

	////////////////////////////////////////////////////////////////////

	var scrollIntoView = function(selector, yPos) {
		yPos = yPos || 4;
		var ep = $(selector).offset().top;
		var eh = $(selector).outerHeight(false);
		var wh = $(window).height();
		var y = ep;
		if(yPos == 'top') {
			// do nothing
		} else if(yPos == 'mid') {
			if(eh < wh) {
				y -= wh / 2;
				y += eh / 2;
			}
		} else if(yPos == 'bottom') {
			y -= wh - eh;
		} else {
			y -= wh / yPos;
		}

		window.scrollTo(0, y);
		//$('html, body').animate({ scrollTop: y }, 300);
	};

	exports.scrollIntoView = scrollIntoView;

	////////////////////////////////////////////////////////////////////

	var makeFullWidth = function(selector, margin) {
		return;
		margin = margin || 0;

		$(selector).each(function(e) {
			var e = $(this);
			var lm = e.data('lastHorzMargin') || 0;
			var ol = Math.min(0, -e.offset().left + lm);
			ol += margin;
			ol = Math.min(0, ol);

			e.css({
				'margin-left' : ol + 'px',
				'margin-right' : ol + 'px'
			});
			e.data('lastHorzMargin', ol);

			if(!e.data('resizeEventReg')) {
				e.data('resizeEventReg', true);
				$(window).resize(function() {
					makeFullWidth(selector);
				});
			}
		});
	};

	exports.makeFullWidth = makeFullWidth;

	var makeFullWidthPadding = function(selector, margin) {
		return;
		margin = margin || 0;

		$(selector).each(function(e) {
			var e = $(this);
			var lm = e.data('lastHorzMargin') || 0;
			var ol = Math.min(0, -e.offset().left + lm);
			ol += margin;
			ol = Math.min(0, ol);

			e.css({
				'margin-left' : ol + 'px',
				'margin-right' : ol + 'px',
				'padding-left' : -ol + 'px',
				'padding-right' : -ol + 'px',
			});
			e.data('lastHorzMargin', ol);

			if(!e.data('resizeEventReg')) {
				e.data('resizeEventReg', true);
				$(window).resize(function() {
					makeFullWidthPadding(selector);
				});
			}
		});
	};

	exports.makeFullWidthPadding = makeFullWidthPadding;

	////////////////////////////////////////////////////////////////////

	var stickyStuck = function(selector) {
		$el = $(selector);

		if($el.data('stickyStuck')) {
			return;
		}
		$el.data('stickyStuck', true);

		var toggleCls = function() {
			var isBottom = $el.parent().children().last().is($el);
			if(isBottom) {
				var offsetTop = $el[0].offsetTop;
				var offsetHeight = $el[0].offsetHeight;
				var parentHeight = $el.parent().height();
				$el.toggleClass('stuck', offsetTop + offsetHeight < parentHeight);
			} else {
				$el.toggleClass('stuck', $el[0].offsetTop > 0);
			}
		};

		toggleCls();
		$(window).on('scroll', toggleCls);
		setInterval(toggleCls, 1000);
	};

	exports.stickyStuck = stickyStuck;

	////////////////////////////////////////////////////////////////////

	var lazyLoadViewportObserver = null;

	var lazyLoad = function(selector, conf) {
		conf = conf || {};
		conf.useObserver = conf.useObserver === undefined ? true : conf.useObserver;
		conf.observedCallback = conf.observedCallback || function(element, executor) {
			executor();
		};

		var onLazyLoaded = function(e, checkInViewPort) {
			conf.observedCallback(e, function() {
				var $e = $(e);
				if(!checkInViewPort || $e.isInViewport()) {
					var dataSrc = $e.data('src') || $e.data('lazy') || $e.data('lazysrc');
					if(dataSrc && $e.attr('src') != dataSrc) {
						$e.attr('src', dataSrc);
					}
				}
			});
		};

		var elements = $(selector);
		elements.each(function() {
			var e = $(this);
			var dataSrc = e.data('src') || e.data('lazy') || e.data('lazysrc');
			if(!dataSrc) {
				return;
			}

			if(conf.useObserver && window.IntersectionObserver) {
				if(e.data('lazyLoadObserved')) {
					return;
				}
				e.data('lazyLoadObserved', true);

				if(!lazyLoadViewportObserver) {
					lazyLoadViewportObserver = new IntersectionObserver(function(entries) {
						for(var i=0; i<entries.length; i++) {
							if(entries[i].isIntersecting) {
								onLazyLoaded(entries[i].target, true);
							}
						}
					});
				}
				lazyLoadViewportObserver.observe(e[0]);

				var checkInterval = setInterval(function() {
					var dataSrc = e.data('src') || e.data('lazy') || e.data('lazysrc');
					if(!dataSrc || dataSrc == e.attr('src')) {
						clearInterval(checkInterval);
						lazyLoadViewportObserver.unobserve(e[0]);
					}
					else if(e.is(':visible') && e.isInViewport()) {
						onLazyLoaded(e[0], false);
					}
				}, 1000);
			}
			else {
				onLazyLoaded(e, false);
			}
		});
	};

	exports.lazyLoad = lazyLoad;
	exports.lazyLoadImages = lazyLoad;
	exports.lazyLoadIframe = lazyLoad;

	////////////////////////////////////////////////////////////////////

	var boxFitText = function(selector) {
		var isOverflowed = function(e) {
			return e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1;
		}
		var raf = window.requestAnimationFrame || function(cb) {
			return setTimeout(cb, 16);
		};
		var loopCounter = 0;
		var doBoxFit = function() {
			var oneOverflowed = false;
			$(selector).each(function() {
				if(isOverflowed(this)) {
					oneOverflowed = true;
					var fs = $(this).css('font-size').replace('px','');
					$(this).css('font-size', (parseInt(fs) - 1) + 'px');
				}
			});
			if(oneOverflowed && loopCounter++ < 10) {
				raf(doBoxFit);
			}
		};
		doBoxFit();
	};

	exports.boxFitText = boxFitText;

	////////////////////////////////////////////////////////////////////

	var iframeDownload = function(src) {
		var iframe = document.getElementById("iframeDownloader");
		if (iframe) {
			iframe.parentNode.removeChild(iframe);
		}
		iframe = document.createElement('iframe');
		iframe.id = "iframeDownloader";
		iframe.style.visibility = 'hidden';
		iframe.style.display = 'none';
		document.body.appendChild(iframe);
		iframe.src = src;
	};

	exports.iframeDownload = iframeDownload;

	////////////////////////////////////////////////////////////////////

	var hookScriptErrors = function(conf) {
		conf.lockTime = conf.lockTime || 60000;
		conf.callback = conf.callback || function() {};

		var oldErrHandler = window.onerror;
		var lastErrorReportTime = 0;
		var errorsReported = {};

		window.onerror = function(msg, url, line, col, error) {
			msg = msg || '';
			url = url || '';
			line = line || '';
			col = col || '';
			error = error || {};

			// check for already reported
			var errId = msg + ':' + url + ':' + line + ':' + col;
			var isErrorReported = errorsReported[errId] ? true : false;

			// do not report too much errors
			var currTime = currentTimeMs();
			var isTimeLock = currTime - lastErrorReportTime < conf.lockTime;

			if(!isTimeLock && !isErrorReported) {
				errorsReported[errId] = true;
				lastErrorReportTime = currTime;
				conf.callback({
					msg : msg,
					url : url,
					line : line,
					col : col,
					error : error
				});
			}

			if (typeof oldErrHandler === 'function') {
				return oldErrHandler(msg, url, line, col, errorObject);
			}

			return false;
		};
	};

	exports.hookScriptErrors = hookScriptErrors;

	////////////////////////////////////////////////////////////////////

	var requireRecaptcha = function(key, callback) {
		utilz.requireScript({
			loadCheck: function() {
				return window.grecaptcha;
			},
			callback: callback,
			script: {
				id: 'grecaptchajs',
				src: 'https://www.google.com/recaptcha/api.js?render=' + key
			}
		});
	};

	exports.requireRecaptcha = requireRecaptcha;

	////////////////////////////////////////////////////////////////////


	// add the exports the the window object
	window[exportsName] = exports;
})('utilz');
