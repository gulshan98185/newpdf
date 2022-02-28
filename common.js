//'use strict';

window.pdf24 = window.pdf24 || {};

pdf24.i18n = {};
pdf24.params = {};

pdf24.isDevel = location.host == 'tools.pdf24.devel';

pdf24.startTime = utilz.currentTimeMs();

pdf24.dlog = function() {
	if(pdf24.isDevel) {
		console.log.apply(null, arguments);
	}
};

/////////////////////////////////////////////////////////////////////////////////

pdf24.cookieInfo = {};

pdf24.updateCookieInfo = function(cookieInfo) {
	for(var e in cookieInfo) {
		if(cookieInfo.hasOwnProperty(e)) {
			pdf24.cookieInfo[e] = cookieInfo[e];
		}
	}
	
	$(document).trigger({
		type: 'cookieInfo',
		cookieInfo: pdf24.cookieInfo
	});
};

/////////////////////////////////////////////////////////////////////////////////

pdf24.trackEvent = function(category, action, label) {
	if(window.ga && typeof window.ga == 'function') {
		ga('send', 'event', {
			'eventCategory' : category || '',
			'eventAction' : action || '',
			'eventLabel' : label || ''
		});
	}
};

pdf24.trackPageEvent = function(category, action, label) {	
	if(document && document.body && document.body.id) {
		category += '@' + document.body.id;
	}
	pdf24.trackEvent(category, action, label);
};

pdf24.trackPageView = function(page) {
	if(window.ga && typeof window.ga == 'function') {
		ga('send', 'pageview', page);
	}
};

/////////////////////////////////////////////////////////////////////////////////

try {
	if(window.PerformanceObserver) {
		pdf24.cls = 0;
		
		new PerformanceObserver(function(entryList) {
			var entries = entryList.getEntries();
			for (var i = 0; i < entries.length; i++) {
				var entry = entries[i];
				if (!entry.hadRecentInput) {
					pdf24.cls += entry.value;
					console.log('Current CLS value:', pdf24.cls, entry);
				}
			}
		}).observe({type: 'layout-shift', buffered: true});
		
		$(window).on('beforeunload', function() {
			if(pdf24.cls >= 0.01) {
				pdf24.trackPageEvent('UI', 'CLS', pdf24.cls.toFixed(2));
			}
		});
	}
} catch (e) {}

/////////////////////////////////////////////////////////////////////////////////

pdf24.errorsReported = {};
pdf24.lastErrorReported = 0;

pdf24.reportError = function(code, data, success) {
	// time based lock
	var currTime = utilz.currentTimeMs();
	if(currTime - pdf24.lastErrorReported < 10000) {
		return;
	}
	
	// do not report errors with same code twice
	if(pdf24.errorsReported[code]) {
		return;
	}
	pdf24.errorsReported[code] = true;
	
	// save last error report time
	pdf24.lastErrorReported = currTime;
	
	// collect data to report
	var reportData = {
		source: location.href,
		navigator: {
			appCodeName : navigator.appCodeName || '',
			appName : navigator.appName || '',
			appVersion : navigator.appVersion || '',
			language : navigator.language || '',
			platform : navigator.platform || '',
			userAgent : navigator.userAgent || ''
		},
		workerServer : (pdf24.workerServer || {}).url,
		errorTime : currTime - pdf24.startTime,
		error: data
	};
	
	pdf24.doPost0('reportError', {
		code: code,
		data: JSON.stringify(reportData)
	}, success);
};

utilz.hookScriptErrors({
	callback : function(err) {
		pdf24.trackPageEvent('ScriptError', err.msg, [err.url, err.line, err.col].join(' | '));
		//pdf24.reportError('ScriptError', err);
		
		if(pdf24.showTopNotification) {
			var msg = 'A script error occurred in your browser. This page may not work correctly. PDF24 requires a modern browser.';
			pdf24.showTopNotification(msg, {
				id : 'scriptErrorNotification',
				cls : 'sticky error',
				closeable : true
			});
		}
	}
});

pdf24.reportXhrError = function(code, xhr, reqData, success) {
	pdf24.trackPageEvent('XhrError', xhr.status + ';' + code, xhr.responseText);
	/*
	if(xhr.status == 400) {
		pdf24.reportError(code, {
			status: xhr.status || '',
			statusText: xhr.statusText || '',
			responseText: xhr.responseText || '',
			reqData: reqData
		}, success);
	}
	*/
};

/////////////////////////////////////////////////////////////////////////////////

pdf24.addAjaxFunctions = function(obj, baseUrl) {
	var addActionOrParams = function(url, actionOrParams) {
		if(actionOrParams) {
			if(typeof actionOrParams == 'string') {
				url += '?action=' + actionOrParams;
			} else {
				var params = jQuery.param(actionOrParams);
				if(params) {
					url += '?' + params;
				}
			}
		}
		return url;
	};
	
	obj.ajax0 = function(settings) {
		if(settings.url) {
			settings.url = baseUrl + settings.url;
		} else {
			settings.url = baseUrl + '/client.php';
		}
		$.ajax(settings);
	};
	
	obj.ajax = function(settings) {
		var oldErr = settings.error;
		settings.error = function(xhr) {
			pdf24.reportXhrError('ajax', xhr, settings.data);
			if(oldErr) {
				oldErr.apply(this, arguments);
			}
		};
		obj.ajax0(settings);
	};
	
	obj.doGet0 = function(data, success, error) {
		$.ajax({
			url : baseUrl + '/client.php',
			type : 'GET',
			data : data,
			success : success,
			error : error
		});
	};
	
	obj.doGet = function(data, success, error) {
		obj.doGet0(data, success, function(xhr) {
			var code = [
				'get',
				data.action || ''
			].join(';');
			pdf24.reportXhrError(code, xhr, data);
			if(error) {
				error.apply(this, arguments);
			}
		});
	};
	
	obj.doPost0 = function(actionOrParams, data, success, error) {
		var url = baseUrl + '/client.php';
		url = addActionOrParams(url, actionOrParams);
		$.ajax({
			url : url,
			type : 'POST',
			data : data,
			success : success,
			error : error
		});
	};
	
	obj.doPost = function(actionOrParams, data, success, error) {
		obj.doPost0(actionOrParams, data, success, function(xhr) {
			var code = [
				'post',
				actionOrParams.action || actionOrParams
			].join(';');
			pdf24.reportXhrError(code, xhr, data);
			if(error) {
				error.apply(this, arguments);
			}
		});
	};
	
	obj.doPostJson0 = function(actionOrParams, data, success, error) {
		var url = baseUrl + '/client.php';
		url = addActionOrParams(url, actionOrParams);
		$.ajax({
			url : url,
			type : 'POST',
			data : JSON.stringify(data),
			contentType : 'application/json; charset=utf-8',
			success : success,
			error : error
		});
	};
	
	obj.doPostJson = function(actionOrParams, data, success, error) {
		obj.doPostJson0(actionOrParams, data, success, function(xhr) {
			var code = [
				'postJson',
				actionOrParams.action || actionOrParams
			].join(';');
			pdf24.reportXhrError(code, xhr, data);
			if(error) {
				error.apply(this, arguments);
			}
		});
	};
};

pdf24.addAjaxFunctions(pdf24, '');

/////////////////////////////////////////////////////////////////////////////////

pdf24.openSharePopup = function(id, shareUrl) {
	pdf24.trackPageEvent('Share', 'ShareBtnClick', id);
	if(!shareUrl && pdf24.getShareUrl) {
		shareUrl = pdf24.getShareUrl();
	}
	utilz.openSharePopup(id, shareUrl);
};

pdf24.findAncestor = function(el, cls) {	
	while ((el = el.parentNode) && !$(el).hasClass(cls));
	return el;
};

$(function() {
	utilz.makeFullWidth('.fullWidth');
	$(window).resize(function() {
		utilz.makeFullWidth('.fullWidth');
	});
});

/////////////////////////////////////////////////////////////////////////////////

pdf24.youtubeLazyLoadApprove = [];

$(document).on('cookieInfo', function() {
	if(pdf24.cookieInfo && pdf24.cookieInfo.youtube) {
		for(var i = 0; i < pdf24.youtubeLazyLoadApprove.length; i++) {
			pdf24.youtubeLazyLoadApprove[i]();
		}
	}
});

pdf24.onElementLazyLoadObserved = function(element, approve) {
	var e = $(element);
	if(e.hasClass('video169')) {
		if(pdf24.cookieInfo && pdf24.cookieInfo.youtube) {
			approve();
		} else {
			pdf24.youtubeLazyLoadApprove.push(approve);
		}
	} else {
		approve();
	}
};

$(function() {
	var elements = $('[data-src].lazyLoad, [data-lazysrc]');
	var elementsInCollapsedSection = $('.sectionsCollapsed .section').find('[data-src].lazyLoad, [data-lazysrc]');
	var elementsToLoad = elements.not(elementsInCollapsedSection);
	utilz.lazyLoad(elementsToLoad, {
		useObserver : true,
		observedCallback : pdf24.onElementLazyLoadObserved
	});
});

utilz.actions.add('sectionExpanded', function(section) {
	var elements = section.find('[data-src].lazyLoad, [data-lazysrc]');
	utilz.lazyLoad(elements, {
		useObserver : true,
		observedCallback : pdf24.onElementLazyLoadObserved
	});
});

/////////////////////////////////////////////////////////////////////////////////

pdf24.showInfoWin = function(which, closeCallback) {
	pdf24.doGet({action:'getInfo', which:which}, function(result) {
		if(!result.success) {
			var_alert(result);
		} else {
			var content = result.data;
			LayerWindow.show({data:content, onClose:closeCallback, bottomLayerMode:'iframe'});
		}
	});
};

pdf24.smallLoader = function(data, imgStyle) {
	data = utilz.LoadingState.makeData(data);
	data.img = '/static/img/loader/rot28.gif';
	data.imgStyle = imgStyle || 'height:16px';
	return utilz.LoadingState.set(data);
};

pdf24.showLoader = function(boxId, imgStyle) {
	var data = utilz.LoadingState.makeData(boxId);
	data.img = '/static/img/loader/squares.gif';
	data.imgStyle = data.imgStyle || imgStyle;
	return utilz.LoadingState.set(data);
};

pdf24.toolSelectBoxFit = function() {
	utilz.boxFitText('.toolSelect .label');
};

$(pdf24.toolSelectBoxFit);

pdf24.requirePageIcons = function() {
	utilz.requireCss({
		file: {
			id: 'pageIconsCss',
			src: '/static/css/pageIcons.css?v=4'
		}
	});
};

pdf24.getPageId = function() {
	return document.body.id || 'undefined';
};

pdf24.getPageLang = function() {
	return $('html').attr('lang');
};

pdf24.getUserLang = function() {
	return (navigator.language || '').substr(0, 2).toLowerCase();
}

$(function() {
	var pageId = pdf24.getPageId();
	if(pageId == 'home') {
		pdf24.requirePageIcons();
	}
	else if(pageId == 'jobMonitor') {
		// page icons not required
	}
	else if(window.IntersectionObserver) {
		var observer = new IntersectionObserver(function(entries) {
			if(entries && entries.length > 0 && entries[0].isIntersecting) {
				pdf24.requirePageIcons();
			}
		});
	
		var toolSelects = document.querySelectorAll('.toolSelect');
		for(var i = 0; i < toolSelects.length; i++) {
			var toolSelect = toolSelects[i];
			var firstPageIcon = toolSelect.querySelector('[class*="pageIcons"]');
			if(firstPageIcon) {
				observer.observe(toolSelect);
			}
		}
	}
	else {
		pdf24.requirePageIcons();
	}	
});

$(function() {
	$('.showOnDocReady').removeClass('showOnDocReady');
	$('.enableOnDocReady').removeClass('enableOnDocReady');
});

/////////////////////////////////////////////////////////////////////////////////

$(function() {
	if(history.state) {
		pdf24.restoreWorkerZoneState(history.state);
	}
});

$(function() {
	window.addEventListener('popstate', function(event) {
		var state = event.state;
		if(!state) {
			state = pdf24.initialWorkerZoneState;
		}
		if(state && state.isWorkerZoneState) {
			pdf24.restoreWorkerZoneState(state);
		}
	});
});

pdf24.restoreWorkerZoneState = function(state) {
	if(!state || !state.isWorkerZoneState || !location.hash) {
		return;
	}
	
	if(!state.initialState) {
		location.reload();
		return;
	}
	
	if(state.workerZonesContent) {
		$('#workerZones').html(state.workerZonesContent);
		$('#workerZones').toggleHidden(!state.workerZonesVisible);
		$('#fileZone, #fileZones, #form, .hideOnWorkerZoneRestore').addHidden();
		$('html').addClass('workerZoneRestored');
		if(state.workerZonesVisible) {
			pdf24.doOnWorkerZoneShow();
		}
		pdf24.trackPageEvent('UI', 'WorkerZoneRestore');
	}
	else if(state.workerZoneContent) {
		$('#workerZone').html(state.workerZoneContent);
		$('#workerZone').toggleHidden(!state.workerZoneVisible);
		$('#fileZone, #fileZones, #form, .hideOnWorkerZoneRestore').addHidden();
		$('html').addClass('workerZoneRestored');
		if(state.workerZoneVisible) {
			pdf24.doOnWorkerZoneShow();
		}
		pdf24.trackPageEvent('UI', 'WorkerZoneRestore');
	}
	
	pdf24.initialWorkerZoneState = state.initialState;
};

pdf24.getWorkerZoneState = function(wzone) {
	var getCleanHtml = function(selector) {
		var content = $(selector).clone();
		//content.find('.adBlock').remove();
		content.find('.adBlock .adSpace').empty().removeAttr('data-adsbygoogle-status');
		return content.html();
	};
	
	return {
		workerZoneContent: getCleanHtml('#workerZone'),
		workerZoneVisible: $('#workerZone').is(":visible"),
		
		workerZonesContent: getCleanHtml('#workerZones'),
		workerZonesVisible: $('#workerZones').is(":visible"),
		
		initialState: pdf24.initialWorkerZoneState,
		isWorkerZoneState: true
	};
};

pdf24.setInitialWorkerZoneState = function() {
	if(pdf24.initialWorkerZoneState) {
		return;
	}
	pdf24.initialWorkerZoneState = pdf24.getWorkerZoneState();
};

pdf24.doOnWorkerZoneShow = function() {
	$('.removeOnWorkerZoneShow').not('.template').remove();
	$('.hideOnWorkerZoneShow').not('.template').addHidden();
	$('.showOnWorkerZoneShow').not('.template').removeHidden();
	
	pdf24.fillAdSpaces();
};

pdf24.initAndShowWorkerZone = function(url, conf) {
	pdf24.setInitialWorkerZoneState();
	conf = conf || {};
	
	var wzone = $('#workerZone');
	wzone.find('iframe.workerFrame').attr('src', url);
	wzone.find('.info').html(conf.zoneInfo || '');
	if(!conf.zoneInfo) {
		wzone.find('.info').remove();
	}	
	wzone.removeHidden();
	
	pdf24.doOnWorkerZoneShow();
	
	// push state for restoration
	if(conf.updateHistory) {
		var newUrl = location.href.replace(location.hash, '') + '#s=' + new Date().getTime();
		var state = pdf24.getWorkerZoneState();
		var hstate = history.state || {};
		if(hstate == 'ExtRefVisit') {
			history.replaceState(state, null, newUrl);
		} else {
			history.pushState(state, null, newUrl);
		}
	}
		
	// scroll after state push for better popstate behavior
	setTimeout(function() {
		utilz.scrollIntoView('#workerZone', conf.scrollToArg || 6);
	}, 50);
};

pdf24.cloneInitShowWorkerZone = function(url, conf) {
	pdf24.setInitialWorkerZoneState();
	conf = conf || {};
	
	var template = $('#workerZoneTemplate');
	if(template.length == 0) {
		template = $('#workerZone');
	}
	var content = template.clone();
	if(content.attr('id') == 'workerZoneTemplate') {
		content.removeAttr('id');
	}
	content.removeClass('template hidden');
	if($('.workerZone').length > 5) {
		content.find('.adBlock').remove();
	}
	
	var wzoneId = 'workerZone-' + $('.workerZone').length;
	var wzone = content;
	if(!wzone.hasClass('workerZone')) {
		wzone = content.find('.workerZone');
	}
	wzone.removeClass('template hidden');
	wzone.attr('id', wzoneId);
	wzone.addClass('workerZone');
	wzone.find('iframe.workerFrame').attr('src', url);
	wzone.find('.info').html(conf.zoneInfo || '');
	if(!conf.zoneInfo) {
		wzone.find('.info').remove();
	}
	
	if($('#workerZones').length == 1) {
		$('#workerZones').prepend(content).removeHidden();
	} else {
		$('#workerZone').after(content);
	}
	
	wzone.removeHidden();
	content.removeHidden();
	
	if(conf.zoneId) {
		wzone.data('zoneId', conf.zoneId);
	}
	
	pdf24.doOnWorkerZoneShow();
	
	// push state for restoration
	if(conf.updateHistory) {
		var newUrl = location.href.replace(location.hash, '') + '#s=' + new Date().getTime();
		var state = pdf24.getWorkerZoneState();
		var hstate = history.state || {};
		if(hstate.isWorkerZoneState || hstate == 'ExtRefVisit') {
			history.replaceState(state, null, newUrl);
		} else {
			history.pushState(state, null, newUrl);
		}
	}
	
	// scroll after state push for better popstate behavior
	setTimeout(function() {
		utilz.scrollIntoView(content, conf.scrollToArg || 6);
	}, 50);
	
	if(conf.pulseIfMultiple && $('.workerZone').length > 1) {
		pdf24.pulseWorkerZone(wzone);
	}
};

pdf24.findWorkerZoneById = function(zoneId) {
	var workerZone = false;
	$('.workerZone').each(function() {
		if(zoneId == $(this).data('zoneId')) {
			workerZone = this;
			return false; // break each
		}
	});
	return workerZone;
}

pdf24.pulseWorkerZone = function(wzone) {	
	utilz.scrollIntoView(wzone);
	wzone = $(wzone);
	if(wzone.data('pulsing')) {
		return;
	}
	wzone.data('pulsing', true);
	var borderColor = wzone.css('border-color');
	var boxShadow = wzone.css('box-shadow');
	var counter = 0;
	var interval = setInterval(function() {
		counter += 1;
		if(counter % 2) {
			wzone.css('border-color', borderColor);
			wzone.css('box-shadow', boxShadow);
			if(counter >= 6) {
				clearInterval(interval);
				wzone.data('pulsing', false);
			}
		} else {
			wzone.css('border-color', 'red');
			wzone.css('box-shadow', '0 0 5px red');
		}
	}, 250);
};

$(window).on("message onmessage", function(e) {
	var event = e.originalEvent;
	$('#workerZone, .workerZone').each(function() {
		var workerZone = $(this);
		var iframe = workerZone.find('iframe');
		if(iframe.length > 0 && iframe[0].contentWindow == event.source) {
			if(event.data.contentHeight) {
				var requiredHeight = event.data.contentHeight;
				var frameHeight = iframe.height();
				if(frameHeight != requiredHeight) {
					iframe.css('height', Math.ceil(requiredHeight) + 'px');
				}
			}			
			return false; // false to stop each
		}
	});
});

/////////////////////////////////////////////////////////////////////////////////

pdf24.isSameServerFile = function(file1, file2) {
	if(!file1 || !file2) {
		return false;
	}
	return file1.file == file2.file && file1.size == file2.size;
};

pdf24.getWorkerServerUrl = function(arg) {
	if(arg.startsWith('http://') || arg.startsWith('https://')) {
		return arg;
	}
	
	if(arg == 'devel') {
		return 'http://doc2pdf.pdf24.devel';
	}
	
	if(arg.indexOf('.') > 0) {
		return 'https://' + arg;
	}
	return 'https://'+ arg +'.pdf24.org';
};

pdf24.createWorkerServerClient = function(conf) {
	if(conf.hostname) {
		conf.url = pdf24.getWorkerServerUrl(conf.hostname);
	}
	if(conf.host) {
		conf.url = pdf24.getWorkerServerUrl(conf.host);
	}
	if(!conf.url) {
		console.warn("Worker server url not specified");
		return;
	}
	
	var ws = {
		url: conf.url
	};
	
	pdf24.addAjaxFunctions(ws, ws.url);
	
	ws.doGetFile = function(serverFile, success, error) {
		var params = {action : 'getFile'};
		if(typeof serverFile == 'object') {
			params.file = serverFile.file;
		} else {
			params.file = serverFile;
		}
		ws.doGet(params, success, error);
	};
	
	ws.getScriptUrl = function(script, params) {
		var url = ws.url + '/' + script;
		if(params) {
			url += '?' + jQuery.param(params);
		}
		return url;
	};
	
	ws.getClientScriptUrl = function(params) {
		return ws.getScriptUrl('client.php', params);
	};
	
	ws.getFileUrl = function(serverFile, params) {
		params = params || {};
		if(typeof serverFile == 'object') {
			params.file = serverFile.file;
		} else {
			params.file = serverFile;
		}
		params.action = 'getFile';
		return ws.getClientScriptUrl(params);
	};
	
	ws.getUploadUrl = function(params) {
		params = params || {};
		params.action = 'upload';
		return ws.getClientScriptUrl(params);
	};
	
	ws.getJobMonitorUrl = function(params) {
		params = params || {};
		params.jobId = ws.makeUniqueJobId(params.jobId);
		var url = 'job-monitor#' + jQuery.param(params);
		if(params.restartable == undefined) {
			url += '&restartable=1';
		}
		if(params.parentResizable == undefined) {
			url += '&parentResizable=1';
		}
		if(params.theme == undefined) {
			var m = ($('html').attr("class") || '').match(/[a-zA-Z0-9]+Theme/);
			if(m) {
				url += '&theme=' + m[0];
			}
		}
		url += '&parentUrl=' + encodeURIComponent(document.location.href);
		return url;
	};
	
	ws.getJobResultUrl = function(jobId, params) {
		params = params || {};
		params.action = 'downloadJobResult';
		params.jobId = jobId;
		return ws.getClientScriptUrl(params);
	};
	
	ws.makeUniqueJobId = function(jobId) {
		if(ws.url.indexOf('pdf24.devel') > 0) {
			return 'devel:' + jobId;
		}
		var m = ws.url.match(new RegExp('://([^.]+)'));
		return m[1] + ':' + jobId;
	};
	
	ws.getHost = function() {
		var matches = this.url.match(new RegExp('https?://([^/]+)'));
		if(matches) {
			return matches[1];
		}
		return null;
	};
	
	return ws;
};

pdf24.selectWorkerServer = function(conf, callback) {
	conf = conf || {};
	conf.pageId = conf.pageId || 'unknown';
	
	callback = callback || function(ws) {};
	
	var prefetchCallback = function(ws) {
		$('head').append('<link rel="dns-prefetch" href="'+ ws.url +'" />');
		callback(ws);
	};
		
	var wsh = utilz.getUrlParam('wsh', false);
	if(wsh) {
		pdf24.workerServer = pdf24.createWorkerServerClient({
			host : wsh
		});
		prefetchCallback(pdf24.workerServer);
		return;
	}
	
	var wshn = utilz.getUrlParam('wshn', false);
	if(wshn) {
		pdf24.workerServer = pdf24.createWorkerServerClient({
			hostname : wshn
		});
		prefetchCallback(pdf24.workerServer);
		return;
	}
	
	if(pdf24.isDevel) {
		pdf24.workerServer = pdf24.createWorkerServerClient({
			url : 'http://doc2pdf.pdf24.devel'
		});
		prefetchCallback(pdf24.workerServer);
		return;
	}
	
	var numHosts = 20;
	var hostnames = [];
	var unavailable = ['_filetools1','_filetools0'];
	for(var i = 0; i < numHosts; i++) {
		hostnames.push('filetools' + i);
	}
	hostnames = hostnames.filter(function(hn) {
		return unavailable.indexOf(hn) < 0;
	});
	var index = Math.floor(Math.random() * hostnames.length);
	var hostname = hostnames[index];
	pdf24.workerServer = pdf24.createWorkerServerClient({
		hostname : hostname
	});
	prefetchCallback(pdf24.workerServer);
};

pdf24.splitJobId = function(jobId) {
	var parts = jobId.replace(':','/').split('/');
	if(parts.length != 2) {
		return false;
	}

	var jobHostname = parts[0];
	var jobId = parts[1];
	return {
		id : jobId,
		hostname : jobHostname,
		uid : jobHostname + ':' + jobId,
		wsc : pdf24.createWorkerServerClient({
			hostname : jobHostname
		})
	};
};

$(function() {
	['href', 'target', 'url'].forEach(function(k) {
		$('a[data-'+ k +']').click(function() {
			var href = this.getAttribute('data-' + k);
			if(href) {
				this.setAttribute('href', href);
				this.removeAttribute('data-' + k);
			}
			return true;
		});
	});
});

$(function() {
	$('.linkLock').each(function(i, v) {
		var jv = $(v);
		jv.data('linkLockActivateTimeout', null);
		jv.data('linkLockActivate', false);
		jv.find('a').click(function(e) {
			if(!jv.data('linkLockActivate')) {
				 e.preventDefault();
			}
		});
		jv.hover(function() {
			jv.data('linkLockActivateTimeout', setTimeout(function() {
				jv.data('linkLockActivate', true);
			}, 750));
		}, function() {
			jv.data('linkLockActivate', false);
			clearTimeout(jv.data('linkLockActivateTimeout'));
		});
	});
});

$(function() {
	$('#footerLangSwitch a').click(function(ev) {		
		var p = $(ev.target).parents('#footerLangSwitch ul');
		if(!p.length == 1 || !p.hasClass('clicked')) {
			ev.preventDefault();
		}
	});
	
	$('#footerLangSwitch ul').click(function(ev) {
		ev.footerLangClick = true;
		$('#footerLangSwitch ul').addClass('clicked');
	});
	
	$(document).click(function(ev) {
		if($(ev.target).parents('#footerLangSwitch').length == 0) {
			$('#footerLangSwitch ul').removeClass('clicked');
		}
	});
});

pdf24.toggleTopToolSelect = function() {
	if($('#bottomToolSelect').length && !$('#topToolSelect .toolSelect').length) {
		var toolSelectNode = $('#bottomToolSelect .toolSelect').clone(true, true);
		$('#topToolSelect').append(toolSelectNode);
		utilz.actions.trigger('topToolSelectInitialized', toolSelectNode);
	}
	
	if($('#topToolSelect').is(':visible')) {
		$('#topToolSelect').addHidden();
		$('#topBar .menu .burger').removeClass('active');
		$('#topBar .allTools').removeClass('active');
	} else {
		pdf24.requirePageIcons();
		$('#topToolSelect').removeHidden();
		$('#topBar .menu .burger').addClass('active');
		$('#topBar .allTools').addClass('active');
	}
};

$(function() {
	$('[data-track-id]').on('click', function() {
		var l = $(this);
		var trackId = l.data('track-id');
		if(trackId) {
			pdf24.trackPageEvent('UI', 'ElementClick', trackId);
		}
		return true;
	});
});

pdf24.monitorJobState = function(conf) {
	conf = conf || {};
	if(!conf.jobId) {
		console.warn('jobId is required');
		return;
	}
	conf.finish = conf.finish || function() {};
	conf.status = conf.status || function() {};
	conf.error = conf.error || function() {};
	conf.interval = conf.interval || 1000;
	conf.startDelay = conf.startDelay === undefined ? 3000 : conf.startDelay;
	
	var jobId = conf.jobId;
	var workerServer = pdf24.workerServer;
	var job = pdf24.splitJobId(conf.jobId);
	if(job && job.wsc) {
		workerServer = job.wsc;
		jobId = job.id;
	}
	if(!workerServer) {
		console.warn('Worker server not specified');
		return;
	}
	
	var doGetStatus = function() {
		workerServer.doGet({
			action : 'getStatus',
			jobId : jobId
		}, function(result, textStatus, xhr) {
			xhr = xhr || {};
			if(result.status == 'done') {
				conf.finish(result);
			} else if(result.status != 'pending') {
				console.warn('Unknown job state', result.status);
				conf.error(xhr, result.status);
			} else {
				conf.status(result);
				setTimeout(doGetStatus, conf.interval);
			}
		}, function(xhr) {
			xhr = xhr || {};
			var status = xhr.status;
			if(status == 400 || status == 404) {
				console.warn('Error monitoring job', status, xhr.responseText);
				conf.error(xhr);
			} else {
				setTimeout(doGetStatus, conf.interval);
			}
		});
	};
	
	setTimeout(doGetStatus, conf.startDelay);
};

pdf24.toPdfConverter = {
	jobs : [],
	doConvert : function() {
		var jobs = this.jobs;
		this.jobs = [];
		this.timeout = null;
		
		var nonPdfJobs = [];
		for(var i=0; i<jobs.length; i++) {
			if(jobs[i].serverFile.file.endsWith('.pdf')) {
				jobs[i].pdfServerFile = $.extend({}, jobs[i].serverFile);
				jobs[i].callback(jobs[i]);
			} else {
				nonPdfJobs.push(jobs[i]);
			}
		}
		if(nonPdfJobs.length == 0) {
			return;
		}
		
		var nonPdfServerFiles = [];
		for(var i=0; i<nonPdfJobs.length; i++) {
			nonPdfServerFiles.push(nonPdfJobs[i].serverFile);
		}

		pdf24.workerServer.doPostJson('convertToPdf', {
			files : nonPdfServerFiles
		}, function(result) {
			pdf24.monitorJobState({
				jobId: result.jobId,
				finish: function(result) {
					for(var i=0; i<nonPdfJobs.length; i++) {
						var prefix = '' + i;
						if(result.job[prefix + '.state'] == '3') {
							nonPdfJobs[i].pdfServerFile = {
								file : result.job[prefix + '.out.file'],
								size : result.job[prefix + '.out.size'],
								name : result.job[prefix + '.out.name'],
								host : pdf24.workerServer.getHost()
							};
						} else {
							nonPdfJobs[i].error = {
								state : result.job[prefix + '.state']
							};
						}
						nonPdfJobs[i].callback(nonPdfJobs[i]);
					}
				},
				error: function(xhr) {
					alert('An error occurred while converting files to PDF.');
				}
			});
		}, function(xhr) {
			alert('An error occurred while converting files to PDF.');
		});
	},
	convert : function(serverFile, callback) {	
		var cb = function(res) {
			if(res.pdfServerFile) {
				res.serverFile.pdfFile = res.pdfServerFile;
			}
			callback(res);
		};
	
		if(serverFile.pdfFile) {
			cb({
				serverFile : serverFile,
				pdfServerFile : serverFile.pdfFile
			});
			return;
		}
		
		if(serverFile.file.endsWith('.pdf')) {
			cb({
				serverFile : serverFile,
				pdfServerFile : $.extend({}, serverFile)
			});
			return;
		}
		
		this.jobs.push({
			serverFile : serverFile,
			callback : cb
		});
		
		if(this.timeout) {
			clearTimeout(this.timeout);
		}
		this.timeout = setTimeout(this.doConvert.bind(this), 1000);
	}
};

pdf24.preferPdfFile = function(file) {
	var sf = file.serverFile || file;
	return sf.pdfFile || sf;
}

pdf24.preferPdfFiles = function(files) {
	var preferred = [];
	for(var i=0; i<files.length; i++) {
		preferred.push(pdf24.preferPdfFile(files[i]));
	}
	return preferred;
}

pdf24.configurePdfJs = function() {
	var pdfjs = pdf24.pdfjs = window['pdfjsLib'];
	pdfjs.GlobalWorkerOptions.workerSrc = '/static/js/pdfjs/pdf.worker.min.js?v=1';
};

pdf24.requirePdfJs = function(callback) {
	callback = callback || function() {};

	if(!pdf24.pdfjs && window['pdfjsLib']) {
		pdf24.configurePdfJs();
	}
	if(pdf24.pdfjs) {
		callback(pdf24.pdfjs);
		return;
	}
	
	if(!pdf24.pdfjsCallbacks) {
		pdf24.pdfjsCallbacks = [];	
	}
	pdf24.pdfjsCallbacks.push(callback);
	
	var pdfjsScriptId = 'pdfJsScript';
	if($('#' + pdfjsScriptId).length > 0) {
		return;
	}
	
	var pdfjsSrc = pdf24.pdfjsSrc || '/static/js/pdfjs/pdf.min.js?v=1';
	var pdfjsScript = $('<script>');
	pdfjsScript.attr('type', 'text/javascript');
	pdfjsScript.attr('id', pdfjsScriptId);
	pdfjsScript.appendTo('body');
	pdfjsScript.attr('src', pdfjsSrc);
	
	pdf24.pdfjsLoadInterval = setInterval(function() {
		if(window['pdfjsLib']) {
			clearInterval(pdf24.pdfjsLoadInterval);
			pdf24.pdfjsLoadInterval = null;
			
			pdf24.configurePdfJs();
			
			for(var i=0; i<pdf24.pdfjsCallbacks.length; i++) {
				pdf24.pdfjsCallbacks[i](pdf24.pdfjs);
			}
			pdf24.pdfjsCallbacks = [];
		}
	}, 100);
};

pdf24.pdfIdForServerFile = function(serverFile, targetId) {
	var pdfId = targetId + '_pdf_' + serverFile.file.replace('.', '_');
	return pdfId;
};

pdf24.isPdfFile = function(file) {
	return file.type == 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf');
};

pdf24.getPdfJsDocumentForFile = function(file, callback, conf) {
	conf = conf || {};
	
	var workerServer = conf.workerServer || pdf24.workerServer;
	var isPdf = pdf24.isPdfFile(file);
	
	var getPdfJsDocumentFor = function(params) {
		params.cMapUrl = '/static/js/pdfjs/cmaps/';
		params.cMapPacked = true;
		
		pdf24.requirePdfJs(function(pdfjs) {
			pdfjs.getDocument(params).promise.then(callback).catch(function(e) {
				var m = (e.name || '') + ' : ' + (e.message || '');
				var mode = 'unknown';
				if(params.url) {
					mode = 'url';
				}
				else if(params.data) {
					mode = 'data';
				}
				pdf24.trackPageEvent('PdfJsError', 'GetDocument:' + mode, m);
			});
		});
	};	

	if(file && file instanceof window.File && isPdf && window.FileReader && window.Uint8Array) {
		var fileReader = new FileReader();
		fileReader.onload = function() {
			 var data = new Uint8Array(this.result);
			 getPdfJsDocumentFor({
			 	data : data
			 });
		};
		fileReader.readAsArrayBuffer(file);
		
		return;
	}
	
	var serverFile = null;
	if(file && file.serverFile) {
		serverFile = file.serverFile;
	}
	else if(file.file && file.host) {
		serverFile = file;
	}
	if(serverFile) {
		if(serverFile.pdfFile) {
			serverFile = serverFile.pdfFile;
		}		
		
		isPdf = pdf24.isPdfFile(serverFile);
		
		if(isPdf) {
			getPdfJsDocumentFor({
				url : workerServer.getFileUrl(serverFile)
			});
		}
		else if(conf.canConvert) {
			pdf24.toPdfConverter.convert(serverFile, function(result) {
				if(result.pdfServerFile) {
					getPdfJsDocumentFor({
						url : workerServer.getFileUrl(result.pdfServerFile)
					});
				}
			});
		}
		
		return;
	}
};

pdf24.showPdfPagesForFile = function(conf) {
	var file = conf.file;
	var serverFile = file.serverFile || file;
	var pageScale = conf.pageScale || (0.5 * (window.devicePixelRatio || 1));
	var pageLoadImg = conf.pageLoadImg;
	var docLoadImg = conf.docLoadImg || pageLoadImg;
	var pageTitle = conf.pageTitle;
	var onDocStart = conf.onDocStart || function(vars) {};
	var onDocEnd = conf.onDocEnd || function(vars) {};
	var onPageStart = conf.onPageStart || function(vars) {};
	var onPageEnd = conf.onPageEnd || function(vars) {};
	var onPageRenderStart = conf.onPageRenderStart || function(vars) {};
	var onPageRenderEnd = conf.onPageRenderEnd || function(vars) {};
	var onPageImgClick = conf.onPageImgClick || function(pdfPageId) {};
	var targetId = conf.targetId || 'pdfLoadZone';
	var pdfId = pdf24.pdfIdForServerFile(serverFile, targetId);
	var pageClass = conf.pageClass || '';
	var pdfPageObjFilter = conf.pdfPageObjFilter || function(vars) {};
	var usePngs = conf.usePngs || false;
	
	var pdfFileObj = $('<div id="'+ pdfId +'" class="pdfFile"></div>');
	pdfFileObj.data('serverFile', serverFile);
	
	var pdfFileTools = $('<div id="'+ pdfId +'_tools" class="pdfFileTools"></div>');
	pdfFileObj.append(pdfFileTools);
	
	var pdfFilePages = $('<div id="'+ pdfId +'_pages" class="pdfPages"></div>');
	pdfFileObj.append(pdfFilePages);
	
	if(docLoadImg) {
		var docImgLoadObj = $('<img class="pdfFileLoader" src="'+ docLoadImg +'" />');
		pdfFilePages.append(docImgLoadObj);
	}
	
	$('#' + targetId).append(pdfFileObj);
	
	var showDocument = function(pdfDoc) {
		var numPages = pdfDoc.numPages;
		pdfFileObj.data('numPages', numPages);
	
		onDocStart({
			conf:conf, pdfId:pdfId, pdfDoc:pdfDoc, numPages:numPages
		});
		
		for(var pageNum = 1; pageNum <= numPages; pageNum++) {
			(function(pdfDoc, pageNum) {
				pdfFilePages.find('.pdfFileLoader').remove();
				
				var layout = '';
				layout += '<div class="pdfPage">';
					layout += '<div class="pdfPageLeft"></div>';
					layout += '<div class="pdfPageCenter">';
						layout += '<div class="pdfPageTop"></div>';
						layout += '<div class="pdfPageMiddle">';
							layout += '<div class="pdfPageContent">';
								layout += '<div class="pdfPageImgContainer"></div>';
								layout += '<div class="pdfPageNumber"></div>';
								layout += '<div class="pdfPageEnlarge"><i class="icon-zoom-in" /></div>';
							layout += '</div>';
						layout += '</div>';
						layout += '<div class="pdfPageBottom"></div>';
					layout += '</div>';
					layout += '<div class="pdfPageRight"></div>';
				layout += '</div>';
				
				var pdfPageId = pdfId + '_' + pageNum;
				var pdfPageObj = $(layout);
				pdfPageObj.attr('id', pdfPageId);
				pdfPageObj.data('pageNum', pageNum);
				pdfPageObj.data('serverFile', serverFile);
				pdfPageObj.addClass(pageClass);
				
				if(pageTitle) {
					var filename = serverFile.name || serverFile.file;
					var thisPageTitle = pageTitle.replace('{pageNum}', pageNum).replace('{fileName}', filename);
					pdfPageObj.attr('title', thisPageTitle);
				}
				
				var pdfPageNumber = pdfPageObj.find('.pdfPageNumber');
				pdfPageNumber.text(pageNum);
				
				var pdfPageEnlarge = pdfPageObj.find('.pdfPageEnlarge');
				pdfPageEnlarge.click(function() {
					pdf24.showFilePreview({
						pdfDoc: pdfDoc,
						pageNum: pageNum
					});
					pdf24.trackPageEvent('UI', 'PdfPagePreviewClick', '');
				});
				
				var pdfPageImgContainer = pdfPageObj.find('.pdfPageImgContainer');
				
				if(pageLoadImg) {
					var pdfPageImgLoadObj = $('<img class="pdfPageLoader" src="'+ pageLoadImg +'" />');
					pdfPageImgContainer.append(pdfPageImgLoadObj);
				}
				
				pdfPageObjFilter({
					pdfPageObj:pdfPageObj, numPages:numPages, pageNum:pageNum,
					isLastPage:pageNum == numPages
				});
				
				pdfFilePages.append(pdfPageObj);
				
				onPageStart({
					conf:conf, pdfDoc:pdfDoc, pageNum:pageNum, pageId:pdfPageId,
					numPages:numPages
				});
				
				pdfDoc.getPage(pageNum).then(function(pdfPage) {
					var viewport = pdfPage.getViewport({ scale : pageScale });
					
					var canvas = document.createElement('canvas');
					canvas.height = viewport.height;
					canvas.width = viewport.width;
					canvas.setAttribute('class', 'pdfPageImg');
					$(canvas).click(function() {
						onPageImgClick(pdfPageId);
					}).hover(function() {
						pdfPageObj.addClass('imgHovered');
					}, function() {
						pdfPageObj.removeClass('imgHovered');
					});
					if(!usePngs) {
						pdfPageImgContainer.append(canvas);
					}
					
					var ctx = canvas.getContext('2d');
					var renderCtx = {
						canvasContext: ctx,
						viewport: viewport
					};
												
					onPageRenderStart({
						conf:conf, pdfDoc:pdfDoc, pageNum:pageNum, pageId:pdfPageId,
						pdfPage:pdfPage, renderCtx:renderCtx, numPages:numPages
					});
					
					pdfPage.render(renderCtx).promise.then( function() {
						ctx.globalCompositeOperation = 'destination-over';
						ctx.fillStyle = "#fff";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						pdfPageImgContainer.find('.pdfPageLoader').remove();
						
						if(usePngs) {
							var pdfPageImgSrc = canvas.toDataURL();
							var pdfPageImg = $('<img class="pdfPageImg" />');
							pdfPageImg.attr('src', pdfPageImgSrc);
							pdfPageImg.click(function() {
								onPageImgClick(pdfPageId);
							});
							pdfPageImg.hover(function() {
								pdfPageObj.addClass('imgHovered');
							}, function() {
								pdfPageObj.removeClass('imgHovered');
							});
							pdfPageImgContainer.append(pdfPageImg);
						}
											
						pdfPageObj.addClass('rendered');
						
						onPageRenderEnd({
							conf:conf, pdfDoc:pdfDoc, pageNum:pageNum, pageId:pdfPageId,
							pdfPage:pdfPage, renderCtx:renderCtx, numPages:numPages
						});
					});
					
					onPageEnd({
						conf:conf, pdfDoc:pdfDoc, pageNum:pageNum, numPages:numPages,
						pageId:pdfPageId, pdfPage:pdfPage
					});
				});
			})(pdfDoc, pageNum);
		}
		
		onDocEnd({
			conf:conf, pdfId:pdfId, pdfDoc:pdfDoc, numPages:numPages
		});
	};
	
	pdf24.getPdfJsDocumentForFile(file, showDocument, {
		canConvert: true
	});
};

pdf24.showPdfPagesForFiles = function(files, conf) {
	var targetId = conf.targetId || 'pdfLoadZone';
	for(var i=0; i<files.length; i++) {
		var file = files[i];
		var serverFile = file.serverFile || file;
		if(!serverFile || !serverFile.file) {
			continue;
		}
		var pdfId = pdf24.pdfIdForServerFile(serverFile, targetId);
		if($('#' + targetId).find('#' + pdfId).length > 0) {
			continue;
		}
		var fileConf = $.extend({}, conf);
		fileConf.file = file;
		pdf24.showPdfPagesForFile(fileConf);
	}
};

/////////////////////////////////////////////////////////////////////////////////

pdf24.requireSlick = function(callback) {
	var slickLoaded = false;
	var slickLightboxLoaded = false;
	var checkAllLoaded = function() {
		if(slickLoaded && slickLightboxLoaded) {
			callback();
		}
	};
	
	utilz.requireCss({
		file: {
			id: 'slickAllCss',
			src: '/static/js/slick/slick.all.css?v=7'
		},
		callback: function() {
			utilz.requireScript({
				loadCheck: function() {
					return jQuery().slick;
				},
				callback: function() {
					slickLoaded = true;
					checkAllLoaded();
				},
				script: {
					id: 'slickScript',
					src: '/static/js/slick/slick.patched.js?v=5'
				}
			});
			
			utilz.requireScript({
				loadCheck: function() {
					return jQuery().slickLightbox;
				},
				callback: function() {
					slickLightboxLoaded = true;
					checkAllLoaded();
				},
				script: {
					id: 'slickLightboxScript',
					src: '/static/js/slick/lightbox/slick-lightbox.min.js?v=3'
				}
			});
		}
	});
};

pdf24.initImageSlider = function(selector) {	
	var items = $(selector);
	if(items.length == 0) {
		return;
	}
	pdf24.requireSlick(function() {
		items.each(function() {
			var imgSlider = $(this);			
			if(imgSlider.hasClass('slick-initialized')) {
				return;
			}
			
			var id = (imgSlider.attr('id') || 'unknown').replace('ImgSlider', '');
			var images = imgSlider.find('img');
			var imgCnt = images.length;
			var slides = imgSlider.data('slides') || 3;
			
			imgSlider.slick({
				arrows: true,
				infinite: false,
				slidesToShow: slides,
				slidesToScroll: 1,
				dots: imgCnt > slides,
				speed: 300,
				adaptiveHeight: true,
				centerMode: false,
				variableWidth: false,
				lazyLoad: 'ondemand',
				responsive: [{
					breakpoint: 1024,
					settings: {
						arrows: true,
						slidesToShow: Math.max(1, slides - 1),
						dots: imgCnt > Math.max(1, slides - 1)
					}
				}, {
					breakpoint: 750,
					settings: {
						arrows: true,
						slidesToShow: Math.max(1, slides - 2),
						dots: imgCnt > Math.max(1, slides - 2)
					}
				}]
			}).on('beforeChange', function() {
				pdf24.trackPageEvent('Slick', 'ImageChange', id);
			});
						
			images.on('load', function(ev) {
				imgSlider.slick('setPosition');	
			});
			
			setInterval(function() {
				if(imgSlider.is(':visible')) {
					imgSlider.slick('setPosition');
				}
			}, 100);
			
			imgSlider.slickLightbox({
				lazy: true,
				itemSelector: 'img',
				src: function(element) {
					$e = $(element);
					var src = $e.data('src') || $e.data('lazy') || $e.data('lazysrc') || $e.attr('src');
					src = src.replace('_thumb_', '').replace('-thumb-', '');
					src = src.replace('_thumb', '').replace('-thumb', '');
					src = src.replace('.jpg', '.png');
					return src;
				}
			}).on('show.slickLightbox', function() {
				pdf24.trackPageEvent('Slick', 'LightBoxShow', id);
			});
		});
	});
};

$(function() {
	var items = $('.imgSlider');
	var itemsInCollapsedSection = $('.sectionsCollapsed .section .imgSlider');
	var itemsToInit = items.not(itemsInCollapsedSection);
	pdf24.initImageSlider(itemsToInit);
});

utilz.actions.add('sectionExpanded', function(section) {
	var imgSliders = section.find('.imgSlider');
	pdf24.initImageSlider(imgSliders);
});

/////////////////////////////////////////////////////////////////////////////////

pdf24.initSectionContent = function(selector) {
	var sections = $(selector);
};

pdf24.expandSection = function(section, args) {
	section = $(section);
	if(section.length == 0) {
		return;
	}
	
	if(!$('html').hasClass('sectionsCollapsed') || section.hasClass('expanded')) {
		section[0].scrollIntoView({behavior: 'smooth'});
		return;
	}
	
	args = args || {};
	var source = args.source || '';
	var scrollTo = args.scrollTo === undefined || args.scrollTo;
	var collapsible = args.collapsible === undefined || args.collapsible;
	var collapseOther = args.collapseOther === undefined || args.collapseOther;
	
	var sectionId = section.attr('id') || '';
	var sections = $('.section');
	
	utilz.actions.trigger('sectionExpand', section, source);
	if(collapseOther) {
		sections.not(section).removeClass('expanded');
	}
	section.addClass('expanded');
	pdf24.initSectionContent(section);
	if(scrollTo) {
		section[0].scrollIntoView({behavior: 'smooth', block: 'center'});
	}
	utilz.actions.trigger('sectionExpanded', section, source);
	
	if(collapsible) {
		var collapseHandle = $('<div class="collapseHandle" />');
		collapseHandle.click(function(event) {
			event.stopPropagation();
			utilz.actions.trigger('sectionCollapse', section, source);
			
			section.removeClass('expanded');
			section.find('.collapseHandle').remove();
			section.find('.content').css('display', '').css('height', '');
			
			utilz.actions.trigger('sectionCollapsed', section, source);
			pdf24.trackPageEvent('UI', 'SectionCollapse', sectionId);
		});
		section.prepend(collapseHandle);
	}
	
	section[0].scrollIntoView({behavior: 'smooth'});
	
	if(source == 'user') {
		pdf24.trackPageEvent('UI', 'SectionExpand', sectionId);
	}
};

pdf24.expandAllSections = function() {
	var sections = $('.section');
	sections.each(function() {
		pdf24.expandSection(this, {
			source : 'auto',
			collapseOther : false,
			collapsible : false,
			scrollTo : false
		});
	});
	
	$('html').removeClass('sectionsCollapsed');
};

pdf24.initSections = function() {
	if(pdf24.sectionsInitalized) {
		return;
	}
	pdf24.sectionsInitalized = true;
	
	var index = 0;
	var sections = $('.section');
	sections.each(function() {
		$(this).addClass('section-' + index);
		$(this).addClass(index % 2 == 0 ? 'even' : 'odd');
		$(this).toggleClass('first', index == 0);
		$(this).toggleClass('last', index == sections.length - 1);
		index += 1;
	});
	sections.click(function() {
		if(!$(this).hasClass('expanded') && $('html.sectionsCollapsed').length) {
			pdf24.expandSection(this, {
				source : 'user',
				scrollTo : false
			});
		}
	});
	
	var expandOnNewUsers = $('html').hasClass('expandSectionsOnNewUsers');
	if(expandOnNewUsers && pdf24.getLastUsedTools().length == 0) {
		pdf24.expandAllSections();
	}
	
	setTimeout(function() {
		var showSection = utilz.getUrlParam('showSection', null);
		if(showSection) {
			pdf24.expandSection('#' + showSection);
		}
	}, 1000);
};

$(pdf24.initSections);

/////////////////////////////////////////////////////////////////////////////////

$(window).on({
	dragover: function(e) {
		e.preventDefault();
		var effect = window.Dropzone && Dropzone.instances.length == 1 ? 'copy' : 'none';
		e.originalEvent.dataTransfer.dropEffect = effect;
		return false;
	},
	drop: function(e) {
		e.preventDefault();
		if(window.Dropzone && Dropzone.instances.length == 1) {
			Dropzone.instances[0].drop(e.originalEvent);
			pdf24.trackPageEvent('UI', 'FileDropForward', '');
		}
		return false;
	}
});

pdf24.getDropzone = function(element) {
	if(!element) {
		element = $('#dropzone');
		if(element.length == 0) {
			return null;
		}
	}
	
	if(element instanceof jQuery) {
		if(element.length == 0) {
			return null;
		}
		element = element[0];
	}

	if(!$(element).hasClass('dropzone')) {
		element = pdf24.findAncestor(element, 'dropzone');
	}
	
	var dropzone = null;
	
	if(element && window.Dropzone) {
		try {
			dropzone = Dropzone.forElement(element);
		} catch(err) {
			// ignore
		}
	}
	
	if(dropzone && !dropzone.extended) {
		dropzone.extended = true;
		
		dropzone.getFiles = function(sort) {
			var files = (dropzone.files || []).slice();
	
			if(sort) {
				var unsorted = [];
				for (var i = 0; i < files.length; i++) {
					var pe = files[i].previewElement;
					var pi = i;
					if(pe) {
						pi = [].indexOf.call(pe.parentNode.children, pe);
					}
					unsorted.push({
						index : pi,
						file : files[i]
					});
				}
				unsorted.sort(function(a, b) {
					return a.index - b.index;
				});
				files = unsorted.map(function(el) {
					return el.file;
				});
			}
			
			return files;
		};
	
		dropzone.getServerFiles = function(sort) {
			var files = dropzone.getFiles(sort);
			var serverFiles = [];
			for (var i = 0; i < files.length; i++) {
				if(files[i].serverFile) {
					serverFiles.push(files[i].serverFile);
				}
			}
			return serverFiles;
		};
		
		dropzone.getProcessingFiles = function() {
			return [].concat(
				dropzone.getAddedFiles(),
				dropzone.getQueuedFiles(),
				dropzone.getUploadingFiles()
			);
		};
	}
	
	return dropzone;
};

pdf24.getFilezone = pdf24.getDropzone;

pdf24.makeFilezoneImmuteable = function(fileZoneElement) {
	$(fileZoneElement).addClass('immutable');
	pdf24.getFilezone(fileZoneElement).disable();
};

pdf24.getFilesForFileZone = function(fileZoneElement, sort) {
	fileZoneElement = fileZoneElement || "#fileZone";
	
	var fileZone = pdf24.getFilezone(fileZoneElement);
	if(!fileZone || !fileZone.files) {
		return [];
	}
	
	return fileZone.getFiles(sort);
};

pdf24.getServerFilesForFileZone = function(fileZoneElement, sort) {
	fileZoneElement = fileZoneElement || "#fileZone";
	
	var fileZone = pdf24.getFilezone(fileZoneElement);
	if(!fileZone || !fileZone.files) {
		return [];
	}
	
	return fileZone.getServerFiles(sort);
};

pdf24.getServerFilesForDefaultFileZone = function() {
	return pdf24.getServerFilesForFileZone("#fileZone");
};

pdf24.getServerFilesSortedForFileZone = function(fileZoneElement) {
	return pdf24.getServerFilesForFileZone(fileZoneElement, true);
};

pdf24.getServerFilesSortedForDefaultFileZone = function() {
	return pdf24.getServerFilesForFileZone("#fileZone", true);
};

pdf24.autoTouchServerFiles = function(fileZoneElement, workerServer) {
	var touchInterval = setInterval(function() {
		var serverFiles = pdf24.getServerFilesForFileZone(fileZoneElement);
		if(serverFiles && serverFiles.length > 0) {
			var workerServer = workerServer || pdf24.workerServer || window.workerServer;
			workerServer.doPostJson('touchFiles', {
				fileInfos : serverFiles
			}, function(result) {
				//console.log(result);
			}, function(xhr) {
				xhr = xhr || {};
				var status = xhr.status;
				if(status == 400 || status == 404) {
					clearInterval(touchInterval);
					console.warn('Error touching server files', status, serverFiles, xhr.responseText);
				}
			});
		}
	}, 1 * 60 * 1000);
};

pdf24.hideDropzoneMessage = function(e) {
	if(e && e.previewElement) {
		var dz = pdf24.findAncestor(e.previewElement, 'dropzone');
		if(dz) {
			$(dz).find('.dz-message').hide();
		}
	}
};

$(function() {
	$('.dropzone').scroll(function(e) {
		var dz = $(e.target);
		var st = dz.scrollTop();
		dz.find('.lowerLeftTools, .lowerRightTools').css('margin-bottom', (-st) + 'px');
	});
});

$(function() {
	$('.filesystemImport').removeClass('disabled');
});

pdf24.importFromFilesystem = function(element) {
	var dropZoneElement = pdf24.findAncestor(element, 'dropzone');
	if(dropZoneElement) {
		var fileZone = pdf24.getFilezone(dropZoneElement);
		if(fileZone) {
			fileZone.hiddenFileInput.click();
		}
	}
	
	pdf24.trackPageEvent('UI', 'ImportToolClick', 'FileSystem');
};

pdf24.importFilesToFileZone = function(fileZoneElement, fileInfos, workerServer) {
	var fileZone = pdf24.getFilezone(fileZoneElement);
	if(!fileZone) {
		return;
	}
	workerServer = workerServer || pdf24.workerServer || window.workerServer;
	if(!workerServer) {
		return;
	}
	
	var queue = utilz.createQueue();
	for(var i=0; i<fileInfos.length; i++) {
		(function(fileInfo) {
			queue.add(fileInfo);
			workerServer.doPostJson('import', {
				fileInfo : fileInfo
			}, function(result) {
				var mockFile = {
					name: result.name,
					size: result.size,
					url: workerServer.getFileUrl(result)
				};
				if(pdf24.isPdfFile(fileInfo)) {
					mockFile.type = 'application/pdf';
				}
				fileZone.files.push(mockFile);
				fileZone.emit("addedfile", mockFile);
				fileZone.emit("complete", mockFile);
				fileZone.emit("success", mockFile, [result]);
				queue.remove(fileInfo);
				if(queue.isEmpty()) {
					fileZone.emit("queuecomplete");
				}
			}, function(xhr) {
				var mockFile = {
					name: fileInfo.name,
					size: fileInfo.size || fileInfo.bytes
				};
				fileZone.emit("addedfile", mockFile);
				fileZone.emit("complete", mockFile);
				fileZone.emit("error", mockFile, 'Import error');
				queue.remove(fileInfo);
				if(queue.isEmpty()) {
					fileZone.emit("queuecomplete");
				}
			});
		})(fileInfos[i]);
	}
};

pdf24.importJobResult = function(fileZoneElement, jobId) {
	var job = pdf24.splitJobId(jobId);
	if(!job) {
		return;
	}

	$(fileZoneElement).addClass('importing');
	job.wsc.doGet({
		action : 'getJobResults',
		jobId : job.id
	}, function(result) {
		$(fileZoneElement).removeClass('importing');
		for(var i=0; i<result.length; i++) {
			result[i].url = job.wsc.getFileUrl(result[i]);
		}
		pdf24.importFilesToFileZone(fileZoneElement, result);
	}, function() {
		$(fileZoneElement).removeClass('importing');
		alert('An error occured importing the files');
	});
};

pdf24.importFromUrlArgs = function(fileZoneElement) {
	var jobId = utilz.getUrlParam('importJobResult');
	if(jobId) {
		pdf24.importJobResult(fileZoneElement, jobId);
		pdf24.trackPageEvent('UI', 'JobResultImport', jobId);
	}
};

pdf24.importFromDropboxToFileZone = function(fileZoneElement, options) {
	if(!window.Dropbox || !pdf24.getFilezone(fileZoneElement)) {
		return;
	}
	options = options || {};
	
	Dropbox.choose({
		success: function(files) {
			pdf24.importFilesToFileZone(fileZoneElement, files);
		},
		linkType: "direct",
		multiselect: true,
		//extensions: ['.pdf', '.doc', '.docx'],
		extensions: options.extensions || null,
		folderselect: false
	});
	
	pdf24.trackPageEvent('UI', 'ImportToolClick', 'Dropbox');
};

pdf24.importFromDropbox = function(element) {
	var dropZoneElement = pdf24.findAncestor(element, 'dropzone');
	if(dropZoneElement) {
		pdf24.importFromDropboxToFileZone(dropZoneElement);
	}
};

pdf24.requireDropbox = function(callback) {
	utilz.requireScript({
		loadCheck: function() {
			return window.Dropbox;
		},
		callback: callback,
		script: {
			id: 'dropboxjs',
			attribs: {
				'data-app-key' : '7pgmdd7640v3no7'
			},
			src: 'https://www.dropbox.com/static/api/2/dropins.js'
		}
	});
};

pdf24.checkDropboxImportEnable = function() {
	var dimp = $('.dropboxImport');
	if(dimp.length > 0 && dimp.is(':visible') && dimp.hasClass('disabled')) {
		pdf24.requireDropbox(function() {
			dimp.removeClass('disabled');
		});
	}
};

$(pdf24.checkDropboxImportEnable);

pdf24.googleApisStatus = {
	loaded: false,
	auth: false,
	picker: false,
	
	oauthTokenExpire: 30 * 60 * 1000,
	oauthToken: false,
	oauthTokenTime: false,
	isOauthTokenValid: function() {
		return this.oauthToken && utilz.currentTimeMs() - this.oauthTokenTime < this.oauthTokenExpire;
	}
};

pdf24.loadGoogleApis = function(callback) {
	if(!pdf24.googleApisStatus.loaded) {
		pdf24.googleApisStatus.loaded = true;
		
		gapi.load('auth', {'callback': function() {
			pdf24.googleApisStatus.auth = true;
		}});
		gapi.load('picker', {'callback': function() {
			pdf24.googleApisStatus.picker = true;
		}});
	}
	
	var interval = setInterval(function() {
		if(pdf24.googleApisStatus.auth && pdf24.googleApisStatus.picker) {
			clearInterval(interval);
			callback();
		}
	}, 100);
};

pdf24.importFromGoogleDriveToFileZone = function(fileZoneElement) {
	var fileZone = pdf24.getFilezone(fileZoneElement);
	if(!fileZone) {
		return;
	}
	
	var clientId = '293682113827-59jp7n1eho86phfuvuq1ml5sho284h0e.apps.googleusercontent.com';
	var appId = '293682113827';
	var scope = ['https://www.googleapis.com/auth/drive.readonly'];
	
	var pickerCallback = function(data) {
		if (data.action == google.picker.Action.PICKED) {
			var fileInfos = [];
			for(var i=0; i<data.docs.length; i++) {
				var doc = data.docs[i];
				fileInfos.push({
					name: doc.name,
					bytes: doc.sizeBytes,
					url: 'https://www.googleapis.com/drive/v3/files/'+ doc.id +'?alt=media',
					bearer: pdf24.googleApisStatus.oauthToken
				});
			}
			pdf24.importFilesToFileZone(fileZoneElement, fileInfos);
		}
	};
	
	var getMimeTypes = function() {
		var resultTypes = [];
		if(fileZone.options.acceptedFiles) {
			var types = fileZone.options.acceptedFiles.split(',');
			for(var i=0; i<types.length; i++) {
				var mt = $.trim(types[i]);
				if(mt == 'image/*') {
					resultTypes.push('image/png');
					resultTypes.push('image/jpeg');
				} else {
					resultTypes.push(mt);
				}
			}
		}
		return resultTypes.length > 0 ? resultTypes.join(',') : null;
	};
	
	var createPicker = function() {
		if(!pdf24.googleApisStatus.oauthToken || !pdf24.googleApisStatus.picker) {
			return;
		}
		
		var view = new google.picker.DocsView(google.picker.ViewId.DOCS);
		view.setIncludeFolders(false);
		view.setSelectFolderEnabled(false);
		var mimeTypes = getMimeTypes();
		if(mimeTypes) {
			view.setMimeTypes(mimeTypes);
		}
		
		var picker = new google.picker.PickerBuilder()
			.enableFeature(google.picker.Feature.NAV_HIDDEN)
			.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
			.setAppId(appId)
			.setOAuthToken(pdf24.googleApisStatus.oauthToken)
			.addView(view)
			.addView(new google.picker.DocsUploadView())
			.setCallback(pickerCallback)
			.build();
		 picker.setVisible(true);
	};
	
	var handleAuthResult = function(authResult) {
		if (authResult && !authResult.error) {
			pdf24.googleApisStatus.oauthToken = authResult.access_token;
			pdf24.googleApisStatus.oauthTokenTime = utilz.currentTimeMs();
			createPicker();
		}
	};
	
	if(pdf24.googleApisStatus.isOauthTokenValid()) {
		createPicker();
	}
	else if(pdf24.googleApisStatus.auth) {
		gapi.auth.authorize({
			'client_id': clientId,
			'scope': scope,
			'immediate': false
		}, handleAuthResult);
	}
	
	pdf24.trackPageEvent('UI', 'ImportToolClick', 'GoogleDrive');
};

pdf24.importFromGoogleDrive = function(element) {
	var dropZoneElement = pdf24.findAncestor(element, 'dropzone');
	if(dropZoneElement) {
		pdf24.importFromGoogleDriveToFileZone(dropZoneElement);
	}
};

pdf24.requireGoogleApi = function(callback) {
	utilz.requireScript({
		loadCheck: function() {
			return window.gapi;
		},
		callback: callback,
		script: {
			id: 'gapiScript',
			src: 'https://apis.google.com/js/api.js?key=AIzaSyBUu7rTgj8NqlVrmq5KtCAUYmZFiUZlXks'
		}
	});
};

pdf24.checkGoogleDriveImportEnable = function() {
	var gimp = $('.googleDriveImport');
	if(gimp.length > 0 && gimp.is(':visible') && gimp.hasClass('disabled')) {
		pdf24.requireGoogleApi(function() {
			pdf24.loadGoogleApis(function() {
				gimp.removeClass('disabled');
			});
		});
	}
};

$(pdf24.checkGoogleDriveImportEnable);

pdf24.moreFileZoneImportToolsToggle = function(elem) {
	var moreTools = $(pdf24.findAncestor(elem, 'importTools')).find('.moreImportTools');
	moreTools.toggle();
	var visible = moreTools.is(':visible');
	$(elem).removeClass('icon-left-open icon-right-open').addClass(visible ? 'icon-right-open' : 'icon-left-open');
	
	if(visible) {
		pdf24.checkGoogleDriveImportEnable();
		pdf24.checkDropboxImportEnable();
	}
	
	pdf24.trackPageEvent('UI', 'MoreImportToolsToggle', '');
};

/////////////////////////////////////////////////////////////////////////////////

$(function() {
	if(history.state || !document.referrer || !$('#tool').length || !$('#moreToolsSection').length) {
		return;
	}
	var referrer = document.referrer.replace(/\/$/, '');
	if(referrer.indexOf('pdf24') >= 0) {
		return;
	}
	
	pdf24.trackPageEvent('Visitor', 'ExtRefVisit', referrer);
	history.pushState('ExtRefVisit', document.title, location.href);
	window.addEventListener('popstate', function(event) {
		if(event.state == null && !pdf24.extRefVisitStatePopped) {
			pdf24.trackPageEvent('Visitor', 'BackBtnLeave', referrer);
			pdf24.expandSection('#moreToolsSection', {source : 'backBtnLeave'});
			$('html, body').animate({
				scrollTop: $('#moreToolsSection').offset().top - 20
			});
			$('#moreToolsSection a').click(function() {
				pdf24.trackPageEvent('Visitor', 'BackBtnLeavePrevented', referrer);
				return true;
			});
		}
	});
});

/////////////////////////////////////////////////////////////////////////////////

pdf24.showTopBottomNotification = function(content, options) {
	options = options || {};
	var position = options.position || 'top';
	var closeable = options.closeable === undefined || options.closeable === true;
	var cls = options.cls || false;
	var css = options.css || false;
	var time = options.time || false;
	var id = options.id || false;
	
	var closeElement = $('<a class="close icon-times" href="#" onclick="$(this).parent().remove(); return false;"></a>');
	var contentElement = $('<div class="content">');
	var notificationElement = $('<div class="topBottomNotification">');
	
	contentElement.append(content);
	if(id) {
		notificationElement.attr('id', id);
	}
	if(closeable) {
		notificationElement.append(closeElement);
	}
	if(cls) {
		notificationElement.addClass(cls);
	}
	if(css) {
		notificationElement.css(css);
	}
	notificationElement.append(contentElement);
	
	if(position == 'bottom') {
		notificationElement.addClass('bottom');
		var target = $('.bottomNotificationsTarget').length ? $('.bottomNotificationsTarget') : $('body');
		target.append(notificationElement);
	} else {
		notificationElement.addClass('top');
		$('body').prepend(notificationElement);
	}
	
	if(time && time > 0) {
		setTimeout(function() {
			notificationElement.remove();
		}, time);
	}
};

pdf24.showTopNotification = function(content, options) {
	options = options || {};
	options.position = 'top';
	pdf24.showTopBottomNotification(content, options);
};

pdf24.showBottomNotification = function(content, options) {
	options = options || {};
	options.position = 'bottom';
	pdf24.showTopBottomNotification(content, options);
};

/////////////////////////////////////////////////////////////////////////////////

pdf24.postThemeChange = function(theme) {
	$('.workerZone iframe.workerFrame').each(function() {
		this.contentWindow.postMessage({
			themeChanged : theme
		}, '*');
	});
};

pdf24.getCurrentTheme = function() {
	var m = ($('html').attr("class") || '').match(/[a-zA-Z0-9]+Theme/);
	return m ? m[0] : 'blueTheme';
}

pdf24.activateTheme = function(theme) {
	if(theme) {
		var themes = $('html').data('themes');
		if(themes) {
			themes = $.map(themes.split(','), $.trim);
			if(themes.indexOf(theme) >= 0) {
				for(var i=0; i<themes.length; i++) {
					$('html').removeClass(themes[i]);
				}
				$('html').addClass(theme);
				utilz.localStorage.setItemString('themeClass', theme);
				pdf24.postThemeChange(theme);
			}
		}
	}
};

pdf24.toggleTheme = function() {
	var activatedTheme = '';
	var themes = $('html').data('themes');
	if(themes) {
		themes = $.map(themes.split(','), $.trim);
		var theme = themes[0];
		for(var i=0; i<themes.length; i++) {
			if($('html').hasClass(themes[i])) {
				activatedTheme = themes[(i + 1) % themes.length];
				pdf24.activateTheme(activatedTheme);
				break;
			}
		}
	}
	
	pdf24.trackPageEvent('UI', 'ThemeToggleClick', activatedTheme);
};

(function() {
	var themeClass = utilz.localStorage.getItemString('themeClass');
	if(themeClass) {
		pdf24.activateTheme(themeClass);
	}
})();

/////////////////////////////////////////////////////////////////////////////////

pdf24.getLastUsedTools = function() {
	var lastUsedTools = utilz.localStorage.getItemObject('lastUsedTools');
	if(!lastUsedTools || !$.isArray(lastUsedTools)) {
		lastUsedTools = [];
	}
	return lastUsedTools;
};

pdf24.addLastUsedTool = function(toolId) {
	var lastUsedTools = pdf24.getLastUsedTools();
	lastUsedTools = lastUsedTools.filter(function(item) {
		return item !== toolId;
	});
	lastUsedTools.push(toolId);
	utilz.localStorage.setItemObject('lastUsedTools', lastUsedTools);
};

pdf24.toolSelectFilter = function(filter) {
	var p = $(this).parents('.toolSelect');
	var toggle = $(document.body).width() >= 1200;
	
	p.find('.filter').removeClass('active');
	p.find('.filter[data-show='+ filter +']').addClass('active');
	p.find('.toolLink').css('opacity', 1).show();
	p.find('input[name="search"]').val('');

	if(filter == 'lastUsed') {
		var limit = 6;
		var lastUsedTools = pdf24.getLastUsedTools();
		p.find('.toolLink').css('opacity', 0.1).toggle(toggle);
		if(lastUsedTools) {
			for(var i = 0; i < lastUsedTools.length && i < limit; i++) {
				var toolId = lastUsedTools[i];
				p.find('.toolLink.' + toolId).css('opacity', 1).show();
			}
		}
	}
	else if(filter == 'favorites') {
		p.find('.toolLink').css('opacity', 0.1).toggle(toggle);
		p.find('.toolLink.favorite').css('opacity', 1).show();
	}
};

$(function() {
	$(".toolSelect .filter").click(function() {
		var filter = $(this).data('show');
		pdf24.toolSelectFilter.call(this, filter);
		pdf24.trackPageEvent('UI', 'FilterClick', filter);
	});
	
	var trackTimeout = null;
	$('.toolSelect .filters input[name="search"]').on('input', function() {
		var searchBox = $(this);
		var searchTerm = searchBox.val().toLowerCase();
		if(!searchTerm) {
			pdf24.toolSelectFilter.call(this, 'all');
			return;
		}
		searchTerm = searchTerm.replace('pdf', '').trim();
		
		var toggle = $(document.body).width() >= 1200;
		var p = $(this).parents('.toolSelect');
		
		p.find('.filter').removeClass('active');
		p.find('.toolLink').each(function() {
			var tags = ($(this).data('tags') || '') + ', ' + $(this).find('.label').text();
			var hide = tags.toLowerCase().indexOf(searchTerm) == -1;
			$(this).css('opacity', hide ? 0.1 : 1).toggle(toggle || !hide);
		});
		
		trackTimeout && clearTimeout(trackTimeout);
		trackTimeout = setTimeout(function() {
			if(searchBox.val()) {
				pdf24.trackPageEvent('UI', 'ToolSearchUsage', searchBox.val());
			}
		}, 1000);
	});
	
	$('.toolSelect .toolLink').click(function() {
		var p = $(this).parents('.toolSelect');
		var searchBox = p.find('.filters input[name="search"]');
		if(searchBox.val()) {
			pdf24.trackPageEvent('UI', 'ToolSearchClick', searchBox.val() + ' | ' + $(this).attr('href'));
		}
		return true;
	});
});

/////////////////////////////////////////////////////////////////////////////////

$(function() {
	$("#rateSection .star").hover(function() {
		$(this).addClass('active');
		$(this).prevAll().addClass('active');
	}, function() {
		if(!$("#rateSection .stars").hasClass('locked')) {
			$("#rateSection .star").removeClass('active');
		}
	}).click(function() {
		$("#rateSection .star").removeClass('active');
		$(this).addClass('active');
		$(this).prevAll().addClass('active');
		$("#rateSection .stars").addClass('locked');
		
		var star = $('#rateSection .star.active').length;
		pdf24.trackPageEvent('Rating', 'RatingStarClick', 'star-' + star);
	});
});

pdf24.submitRating = function(btn, pageId) {
	if(!$("#rateSection .stars").hasClass('locked')) {
		return;
	}
	var langCode = (navigator.language || '').substr(0, 2).toLowerCase();
	var stars = $('#rateSection .star.active').length;
	var messageElement = $('#rateSection [name="reviewText"]');
	var message = messageElement.val().trim();
	
	if(stars <= 3 && !message) {
		messageElement.addClass('errorBox');
		return;
	}
	messageElement.removeClass('errorBox');
	
	btn = $(btn);
	var box = btn.parent();
	btn.remove();
	box.text(btn.data('msg'));
	pdf24.doPost('submitRating', {
		pageId: pageId,
		langCode: langCode,
		source: location.href,
		stars: stars,
		message: message
	}, function() {
		// nothing
	});
	
	pdf24.trackPageEvent('Rating', 'RatingSubmit', 'stars-' + stars);
};

/////////////////////////////////////////////////////////////////////////////////

$(function() {
	$('.qas .question').click(function() {
		var questionAnswer = $(this).parent();
		var questionAnswers = questionAnswer.parent();
		questionAnswers.find('.active').not(questionAnswer).removeClass('active');
		questionAnswer.toggleClass('active');
		
		pdf24.trackPageEvent('FAQ', 'QuestionClick', 'question-' + questionAnswer.index());
	});
});

/////////////////////////////////////////////////////////////////////////////////

if ('serviceWorker' in navigator) {
	if(location.host != 'tools.pdf24.devel' && location.host != 'tools-origin.pdf24.org') {
		window.addEventListener('load', function() {
			debugger;
			navigator.serviceWorker.register('/serviceWorker.js').then(function(reg) {
		    	//console.log('Successfully registered service worker', reg);
			}).catch(function(err) {
				console.warn('Error whilst registering service worker', err);
			});
		});
	}
}

/////////////////////////////////////////////////////////////////////////////////

pdf24.fillAdSpaces0 = function() {
	if(pdf24.isDevel) {
		return;
	}
		
	window.adsbygoogle = window.adsbygoogle || [];
	$('.adsbygoogle:hidden').removeClass('adsbygoogle');
	
	if(pdf24.cookieInfo.personalizedAds === false) {
		window.adsbygoogle.requestNonPersonalizedAds = 1;
	}
	
	var loadAdScript = function() {
		if(document.getElementById('adsbygoogleScript')) {
			return;
		}
		
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.id = 'adsbygoogleScript';
		s.src = '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
		s.async = true;
		document.body.appendChild(s);
	};
	
	var handleAdBlock = function(adBlock) {
		if(adBlock.hasClass('filled') || adBlock.closest('.template').length || !adBlock.is(':visible')) {
			return;
		}
		
		var adText = adBlock.find('.adText');
		adText.removeHidden();
		
		var adSpace = adBlock.find('.adSpace');
		adSpace.removeHidden();	
		if(!adSpace.hasClass('adsbygoogle')) {
			adSpace.addClass('adsbygoogle');
		}
		
		if(adSpace.children().length == 0) {
			try {
				var params = { google_ad_client: 'ca-pub-6059744425544233' };
				if(Math.random() < 0.05 || (location.hash || '').startsWith('#updaten') || adSpace.data('adtest')) {
					//params = { google_ad_client: 'ca-pub-9961989572247256', google_ad_slot: '5754258826' };
				}
				window.adsbygoogle.push({ params : params });
			} catch(error) {
				  console.error(error);
			}
		}
		
		adBlock.addClass('filled');
		loadAdScript();
	};
	
	$('.adBlock').each(function() {
		var adBlock = $(this);
		setTimeout(function() {
			handleAdBlock(adBlock);
		}, 100);
	});
};

pdf24.fillAdSpaces = function() {
	if(pdf24.cookieInfo && pdf24.cookieInfo.adsense) {
		pdf24.fillAdSpaces0();
	}
};

utilz.actions.add('sectionExpanded', function(section) {
	pdf24.fillAdSpaces();
});

$(window).on('load', pdf24.fillAdSpaces);
$(window).on('resize', pdf24.fillAdSpaces);
$(document).on('cookieInfo', pdf24.fillAdSpaces);

/////////////////////////////////////////////////////////////////////////////////

pdf24.requireSortable = function(callback) {
	utilz.requireScript({
		loadCheck: function() {
			return window.Sortable;
		},
		callback: callback,
		script: {
			id: 'sortableScript',
			src: '/static/js/Sortable.min.js?v=1'
		}
	});
	
	$.fn.sortable = function (options) {
		var retVal, args = arguments;
		this.each(function () {
			var $el = $(this), sortable = $el.data('sortable');
			if (!sortable && (options instanceof Object || !options)) {
				sortable = new Sortable(this, options);
				$el.data('sortable', sortable);
			} else if (sortable) {
				if (options === 'destroy') {
					sortable.destroy();
					$el.removeData('sortable');
				} else if (options === 'widget') {
					retVal = sortable;
				} else if (typeof sortable[options] === 'function') {
					retVal = sortable[options].apply(sortable, [].slice.call(args, 1));
				} else if (options in sortable.options) {
					retVal = sortable.option.apply(sortable, args);
				}
			}
		});
		return (retVal === void 0) ? this : retVal;
	};
};

pdf24.requirePopper = function(callback) {
	utilz.requireScript({
		loadCheck: function() {
			return window.Popper;
		},
		callback: callback,
		script: {
			id: 'popperScript',
			src: '/static/js/popper.min.js'
		}
	});
};

pdf24.requireTippy = function(callback) {
	pdf24.requirePopper(function() {
		utilz.requireScript({
			loadCheck: function() {
				return window.tippy;
			},
			callback: callback,
			script: {
				id: 'tippyScript',
				src: '/static/js/tippy-bundle.iife.min.js'
			}
		});
	});	
};

pdf24.hideTippies = function() {
	if(!window.tippy) {
		return;
	}
	
	tippy.hideAll();
};

$(window).on('scroll', function() {
	pdf24.hideTippies();
});

pdf24.setTooltip = function(element, content) {
	if(!element) {
		return;
	}
	
	if(element instanceof jQuery) {
		if(element.length == 0) {
			return;
		}
		element = element[0];
	}
	
	pdf24.requireTippy(function() {
		tippy(element, {
			content: content,
			duration: [300, 0],
			touch: false,
			zIndex: 99
		});
	});
};

pdf24.trackedTippyTitles = {};

pdf24.tippyTitles = function(root) {
	var root = $(root || 'body');

	var attachTippy = function(elem) {
		var el = elem;
		var $el = $(el);
		if($el.data('tippy-instance')) {
			return;
		}
		
		var title = $el.attr('title') || $el.data('title');
		if(!title) {
			return;
		}
		
		$el.data('title', title);
		$el.removeAttr('title');
		var tpl = $el.data('tippy-template');
		if(tpl && document.getElementById(tpl)) {
			title = $('#' + tpl).html();
		}
		
		var inst = tippy(el, {
			content: title,
			duration: [300, 0],
			touch: false,
			zIndex: 9999,
			trigger: 'mouseenter',
			onShow: function(inst) {
				tippy.hideAll();
				var tid = $(inst.reference).data('tippy-track-id');
				if(tid && !pdf24.trackedTippyTitles[tid]) {
					pdf24.trackedTippyTitles[tid] = true;
					pdf24.trackPageEvent('UI', 'TippyShow', tid);
				}
			}
		});
		$el.data('tippy-instance', inst);
	};
	
	pdf24.requireTippy(function() {
		root.one('mouseenter', function() {
			attachTippy(this);
		});
		root.find('[title]').one('mouseenter', function() {
			attachTippy(this);
		});
	});
};

$(function() {
	pdf24.tippyTitles();
	
	utilz.actions.add('topToolSelectInitialized', function(toolSelectNode) {
		toolSelectNode.find('.tile ').removeData('tippy-instance');
		pdf24.tippyTitles();
	});
});

pdf24.setDropzoneView = function(element, viewId) {
	var dropZone = $(element);
	if(!dropZone.hasClass('dropzone')) {
		dropZone = dropZone.parents('.dropzone');
	}
	dropZone.toggleClass('listView', viewId == 'listView');
	var viewSelect = dropZone.find('.viewSelect');
	viewSelect.find('.viewSelectBtn').removeClass('selected');
	viewSelect.find('.viewSelectBtn.' + viewId).addClass('selected');
	
	dropZone.find('.dz-preview').each(function() {
		var e = $(this);
		if(viewId == 'listView') {
			var details = e.find('.dz-details');
			e.find('.dz-tools').appendTo(e);
			e.find('.dz-filename').prependTo(details);
		} else {
			e.find('.dz-tools').prependTo(e);
			e.find('.dz-filename').appendTo(e);
		}
	});
	
	pdf24.trackPageEvent('UI', 'SetDropzoneView', viewId);
};

pdf24.sortDropzoneFiles = function(element, sortMode) {
	var dropZone = pdf24.getDropzone(element);
	if(!dropZone || !dropZone.files || dropZone.files.length <= 1) {
		return;
	}
	var files = dropZone.files.slice();
	
	var cmp = function(a, b) {
		return a.localeCompare(b);
	};
	if(window.Intl && window.Intl.Collator) {
		cmp = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare;
	}
	var sortUp = function(a, b) {
		return cmp(a.name, b.name);
	};
	var sortDown = function(a, b) {
		return cmp(b.name, a.name);
	};
	var sort = sortMode == 'down' ? sortDown : sortUp;
	
	files.sort(sort);
	
	for(var i=0; i<files.length; i++) {
		files[0].previewElement.parentNode.appendChild(files[i].previewElement);
	}
	
	pdf24.trackPageEvent('UI', 'SortDropzoneFiles', sortMode);
};

pdf24.showJobResult = function(jobId) {
	var job = pdf24.splitJobId(jobId);
	if(!job) {
		return false;
	}
	
	$('#fileZone').hide();
	
	var monitorUrl = job.wsc.getJobMonitorUrl({
		jobId : job.id
	});
	
	if($('#workerZones').lenght) {
		pdf24.cloneInitShowWorkerZone(monitorUrl);
	} else {
		pdf24.initAndShowWorkerZone(monitorUrl);
	}
	
	pdf24.trackPageEvent('UI', 'ShowJobResult', jobId);
	
	return true;
};

pdf24.checkShowJobResult = function() {
	var showJob = utilz.getUrlParam('showJob', false);
	var jobResult = utilz.getUrlParam('jobResult', false);
	var jobId = showJob || jobResult;
	if(!jobId) {
		return false;
	}
	return pdf24.showJobResult(jobId);
};

pdf24.shuffleArray = function(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	
	return array;
}

pdf24.getFormValues = function(form) {
	form = $(form);
	
	var fields = {};
	form.find('input, select, textarea').each(function() {
		var field = $(this);
		var type = field.attr('type');
		var name = field.attr('name');
		if(fields[name] !== undefined) {
			return;
		}
		if(type == 'radio') {
			fields[name] = form.find('[name="'+ name +'"]:checked').val().trim();
		} else if(type == 'checkbox') {
			fields[name] = 	field.is(":checked");
		} else if(type == 'number') {
			fields[name] = 	parseFloat(field.val().trim());
		} else {
			fields[name] = 	field.val().trim();
		}
		var filter = field.data('filter');
		if(filter) {
			fields[name] = filter(fields[name]);
		}
	});
	
	return fields;
};

pdf24.getFormFields = function(form) {
	form = $(form);
	
	var list = [];
	form.find('[name]').each(function() {
		var f = $(this);
		var name = f.attr('name');
		var id = f.attr('id');
		var label = name;
		if(id) {
			var label1 = form.find('label[for="'+ id +'"]').text();
			if(label1) {
				label = label1;
			}
		}			
		var value = f.val();
		var valueText = value;
		if(this.tagName == 'SELECT') {
			valueText = f.find('option[value="'+ value +'"]').text();
		}
		list.push({
			name : name,
			label : label,
			value : value,
			valueText : valueText
		});
	});
	
	return {
		list : list,
		toString : function(paramsSep, keyValueSep) {
			var parts = [];
			for(var i=0; i<this.list.length; i++) {
				var param = this.list[i];
				var pl = param.label.replace(/:$/, '');
				var str = pl + (keyValueSep || ': ') + param.valueText;
				parts.push(str);
			}
			return parts.join(paramsSep || ', ');
		},
		toHtml : function(paramsSep, keyValueSep) {
			var parts = [];
			var tpl = '<span class="formParam"><span class="key">{k}</span>'+ (keyValueSep || ': ') +'<span class="value">{v}</span></span>';
			for(var i=0; i<this.list.length; i++) {
				var param = this.list[i];
				var pl = param.label.replace(/:$/, '');
				var str = tpl.replace('{k}', pl).replace('{v}', param.valueText);
				parts.push(str);
			}
			return parts.join(paramsSep || ', ');
		},
		toId : function(paramsSep, keyValueSep) {
			var parts = [];
			for(var i=0; i<this.list.length; i++) {
				var param = this.list[i];
				parts.push(param.name + (keyValueSep || ':') + param.value);
			}
			return parts.join(paramsSep || ';');
		}
	};
};

pdf24.cloneWithCanvas = function(elem) {
	var newElem = elem.clone();
	if(elem.find('canvas').length > 0) {
		var oldCanvas = elem.find('canvas')[0];
		var newCanvas = newElem.find('canvas')[0];
		var ctx = newCanvas.getContext('2d');
		ctx.drawImage(oldCanvas, 0, 0);
	}
	return newElem;
};

pdf24.canPreviewFile = function(file) {
	if(!window.URL || !window.URL.createObjectURL) {
		return false;
	}
	return file.type && (file.type == 'application/pdf' || file.type.match(/image.*/));
};

pdf24.showFilePreview = function(file, conf) {
	conf = conf || {};
	conf.rotate = conf.rotate || 0;
	conf.rotateCallback = conf.rotateCallback || function(rot) {};
	
	if(!pdf24.filePreviewKeyCloseInstalled) {
		pdf24.filePreviewKeyCloseInstalled = true;
		$(document).keyup(function(e) {
			if(e.keyCode == 27) {
				$('.overlayFilePreview .icon-times').click();				
			}
		});
	}
	
	if(!pdf24.filePreviewFrameResizeInstalled) {
		pdf24.filePreviewFrameResizeInstalled = true;
		$(window).resize(function(e) {
			if(pdf24.currentPreviewer && pdf24.currentPreviewer.updateTransform) {
				pdf24.currentPreviewer.updateTransform();
			}
		});
	}

	var previewer = {
		scale: 0.85,
		rotate: conf.rotate,
		updateCnt: 0
	};
	pdf24.currentPreviewer = previewer;
	
	previewer.updateTransform = function() {
		if(!previewer.aspectRatio) {
			return;
		}
		
		previewer.updateCnt += 1;
		
		var content = previewer.previewContent;
		var contentWidth = content.width();
		var contentHeight = content.height();
		var contentRatio = contentHeight / contentWidth;
		var rotate = previewer.rotate || 0;
		var elem = previewer.img || previewer.canvas;
		var wrapper = previewer.previewElementWrapper;
		
		var scale = previewer.scale || 1;
		var elementHeight = contentHeight * scale;
		var elementWidth = elementHeight / previewer.aspectRatio;
		if(previewer.aspectRatio < contentRatio) {
			elementWidth = contentWidth * scale;
			elementHeight = elementWidth * previewer.aspectRatio;
		}
		
		if(rotate == 90 || rotate == 270) {
			elementWidth = contentHeight * scale;
			elementHeight = elementWidth * previewer.aspectRatio;
			if(contentRatio > 1 / previewer.aspectRatio) {
				elementHeight = contentWidth * scale;
				elementWidth = elementHeight / previewer.aspectRatio;
			}
		}
				
		var wrapperWidth = elementWidth;
		var wrapperHeight = elementHeight;
		if(rotate == 90 || rotate == 270) {
			var temp = wrapperWidth;
			wrapperWidth = wrapperHeight;
			wrapperHeight = temp;
		}
		wrapper.css({
			width: wrapperWidth,
			height: wrapperHeight,
			left: wrapperWidth > contentWidth ? 0 : (contentWidth - wrapperWidth) / 2,
			top: wrapperHeight > contentHeight ? 0 : (contentHeight - wrapperHeight) / 2
		});
				
		elem.css({
			width: elementWidth,
			height: elementHeight,
			maxWidth: 'none',
			maxHeight: 'none',
			position: 'relative',
			left: 0,
			top: 0,
			transformOrigin: rotate == 90 || rotate == 270 ? 'top left' : '50% 50%',
			transform: 'rotate('+ rotate +'deg)'
		});
		
		if(rotate == 90) {
			elem.css({
				left: elementHeight + 'px'
			});
		}
		if(rotate == 270) {
			elem.css({
				top: elementWidth + 'px'
			});
		}
	};
	
	previewer.updatePage = function() {
		previewer.updateTransform();
	};
	
	previewer.initForPdfDoc = function(pdfDoc, page) {
		previewer.hasPages = true;
		previewer.pdfDoc = pdfDoc;
		previewer.numPages = pdfDoc.numPages;
		previewer.page = page || 1;
		previewer.updatePage = function() {
			var page = previewer.page || 1;
			var numPages = previewer.numPages;
			if(page >= 1 && page <= numPages) {
				pdfDoc.getPage(page).then(function(pdfPage) {
					var viewport0 = pdfPage.getViewport({ scale : 1 });
					var scale1 = previewer.previewContent.height() / viewport0.height;
					var scale2 = previewer.previewContent.width() / viewport0.width;
					var scale = Math.min(scale1, scale2);						
					var dpr = window.devicePixelRatio || 1;
					var viewport = pdfPage.getViewport({ scale : 1.0 * previewer.scale * scale * dpr });
					var canvas = document.createElement('canvas');
					canvas.height = viewport.height;
					canvas.width = viewport.width;
					
					previewer.aspectRatio = viewport.height / viewport.width;
					
					var ctx = canvas.getContext('2d');
					var renderCtx = {
						canvasContext: ctx,
						viewport: viewport
					};
					
					pdfPage.render(renderCtx).promise.then( function() {
						ctx.globalCompositeOperation = 'destination-over';
						ctx.fillStyle = "#fff";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						if(previewer.canvas) {
							previewer.canvas.remove();
						}
						
						previewer.canvas = $(canvas);
						previewer.canvas.addClass('element');
						previewer.canvas.appendTo(previewer.previewElementWrapper);
						previewer.updateTransform();
						
						previewer.previewToolsCurrPage.text(page + ' / ' + numPages);
					});
				});
			}
		};
	};
	
	previewer.preview = $('<div class="overlayFilePreview" />');
	
	previewer.previewTools = $('<div class="tools" />');
	previewer.previewTools.appendTo(previewer.preview);
	
	previewer.previewContent = $('<div class="content" />');
	previewer.previewContent.appendTo(previewer.preview);
	
	previewer.previewElementWrapper = $('<div class="elementWrapper" />');
	previewer.previewElementWrapper.appendTo(previewer.previewContent);
	
	if (file.type && file.type.match(/image.*/)) {
		previewer.objUrl = URL.createObjectURL(file);
				
		previewer.img = $('<img class="element" />');
		previewer.img.on('load', function() {
			previewer.aspectRatio = this.naturalHeight / this.naturalWidth;
			previewer.updateTransform();
		});
		previewer.img.attr('src', previewer.objUrl);
		previewer.img.appendTo(previewer.previewElementWrapper);
		
		previewer.updateTransform();
	}
	else if(file.type == 'application/pdf') {
		previewer.hasPages = true;
		pdf24.getPdfJsDocumentForFile(file, function(pdfDoc) {
			previewer.initForPdfDoc(pdfDoc, 1);
			previewer.updatePage();
		});
	}
	else if(file.pdfDoc) {
		previewer.initForPdfDoc(file.pdfDoc, file.pageNum);
		previewer.updatePage();
	}
	else {
		console.warn('Preview not supported for file type ' + file.type);
	}
		
	if(previewer.hasPages) {
		previewer.previewToolsPrevPage = $('<i class="icon-left-open" />');
		previewer.previewToolsPrevPage.appendTo(previewer.previewTools);
		previewer.previewToolsPrevPage.click(function() {
			var page = previewer.page || 1;
			if(page > 1) {
				page -= 1;
				previewer.page = page;
				previewer.updatePage();
			}
		});
		
		previewer.previewToolsCurrPage = $('<span class="currentPage" />');
		previewer.previewToolsCurrPage.appendTo(previewer.previewTools);
		
		previewer.previewToolsNextPage = $('<i class="icon-right-open" />');
		previewer.previewToolsNextPage.appendTo(previewer.previewTools);
		previewer.previewToolsNextPage.click(function() {
			var page = previewer.page || 1;
			if(previewer.numPages && page < previewer.numPages) {
				page += 1;
				previewer.page = page;
				previewer.updatePage();
			}
		});
	}
	
	previewer.previewToolsZoomIn = $('<i class="icon-zoom-in" />');
	previewer.previewToolsZoomIn.appendTo(previewer.previewTools);
	previewer.previewToolsZoomIn.click(function() {
		var scale = previewer.scale || 1;
		scale *= 1.10;
		previewer.scale = scale;
		previewer.updatePage();
	});
	
	previewer.previewToolsZoomOut = $('<i class="icon-zoom-out" />');
	previewer.previewToolsZoomOut.appendTo(previewer.previewTools);
	previewer.previewToolsZoomOut.click(function() {
		var scale = previewer.scale || 1;
		scale *= 0.90;
		previewer.scale = scale;
		previewer.updatePage();
	});
	
	previewer.previewToolsRotLeft = $('<i class="icon-ccw" />');
	previewer.previewToolsRotLeft.appendTo(previewer.previewTools);
	previewer.previewToolsRotLeft.click(function() {
		var rot = previewer.rotate || 0;
		rot = (rot + 270) % 360;
		previewer.rotate = rot;
		previewer.updateTransform();
		conf.rotateCallback(rot, previewer.page);
	});
	
	previewer.previewToolsRotRight = $('<i class="icon-cw" />');
	previewer.previewToolsRotRight.appendTo(previewer.previewTools);
	previewer.previewToolsRotRight.click(function() {
		var rot = previewer.rotate || 0;
		rot = (rot + 90) % 360;
		previewer.rotate = rot;
		previewer.updateTransform();
		conf.rotateCallback(rot, previewer.page);
	});
	
	previewer.previewToolsClose = $('<i class="icon-times" />');
	previewer.previewToolsClose.appendTo(previewer.previewTools);
	previewer.previewToolsClose.click(function() {
		if(previewer.objUrl) {
			URL.revokeObjectURL(previewer.objUrl);
		}
		previewer.preview.remove();
		$('html').removeClass('hasOverlayFilePreview');
		pdf24.currentPreviewer = null;
	});
	
	$('html').addClass('hasOverlayFilePreview');
	previewer.preview.appendTo(document.body);
};

pdf24.dropzoneFileAdded = function(file, conf) {
	conf = conf || {};
	conf.thumbnail = conf.thumbnail === undefined ? true : conf.thumbnail;
	
	var pe = $(file.previewElement);
	pe.addClass('dz-hasTools');
	pe.find('.dz-image').hover(pe.addClass.bind(pe, 'dz-image-hover'), pe.removeClass.bind(pe, 'dz-image-hover'));
		
	var dze = pe.closest('.dropzone');
	var dz = pdf24.getDropzone(dze);
	
	if(dze.hasClass('listView')) {
		var details = pe.find('.dz-details');
		pe.find('.dz-filename').prependTo(details);
	} else {
		pe.find('.dz-filename').appendTo(pe);
	}
		
	if(conf.tools) {
		var tools = $('<div class="dz-tools" />');
		tools.css('pointer-events', 'none');
		
		if(conf.rotate || conf.rotateLeft) {			
			var rotLeft = $('<i class="icon-ccw" />');
			rotLeft.attr('title', pdf24.i18n.filezoneRotateLeft || '');
			rotLeft.click(function() {
				pdf24.trackPageEvent('UI', 'FileRotateLeftClick', '');
				
				var angle = pe.data('rotate') || 0;
				angle = (angle + 270) % 360;
				pe.data('rotate', angle);
				pe.attr('data-rotate', angle);
			});
			tools.append(rotLeft);
		}
		
		if(conf.rotate || conf.rotateRight) {
			var rotRight = $('<i class="icon-cw" />');
			rotRight.attr('title', pdf24.i18n.filezoneRotateRight || '');
			rotRight.click(function() {
				pdf24.trackPageEvent('UI', 'FileRotateRightClick', '');
				
				var angle = pe.data('rotate') || 0;
				angle = (angle + 90) % 360;
				pe.data('rotate', angle);
				pe.attr('data-rotate', angle);
			});
			tools.append(rotRight);
		}
		
		if(conf.view && pdf24.canPreviewFile(file)) {
			var rotateCallback = function(angle, page) {
				if (file.type && file.type.match(/image.*/)) {
					pe.data('rotate', angle);
					pe.attr('data-rotate', angle);
				}
			};
			
			var view = $('<i class="icon-zoom-in" />');
			view.attr('title', pdf24.i18n.filezoneViewFileEnlarged || '');
			view.click(function() {
				pdf24.trackPageEvent('UI', 'FilePreviewClick', '');
				pdf24.showFilePreview(file, {
					rotateCallback : rotateCallback,
					rotate : pe.data('rotate')
				});
			});
			tools.append(view);
			
			pe.find('.dz-image').on('dblclick', function() {
				pdf24.trackPageEvent('UI', 'FilePreviewDblClick', '');
				pdf24.showFilePreview(file, {
					rotateCallback : rotateCallback,
					rotate : pe.data('rotate')
				});
			});
		}
		
		if(conf.remove) {      
			var rem = $('<i class="icon-trash dz-remove" data-dz-remove />');
			rem.attr('title', pdf24.i18n.filezoneRemoveFile || '');
			rem.click(function() {
				pdf24.trackPageEvent('UI', 'FileRemoveClick', '');
				if(!pdf24.i18n.filezoneConfirmRemoveFile || window.confirm(pdf24.i18n.filezoneConfirmRemoveFile)) {
					dz.removeFile(file);
				}
			});
			tools.append(rem);
		}
			
		if(dze.hasClass('listView')) {
			pe.append(tools);
		} else {
			pe.prepend(tools);
		}
		
		setTimeout(function() {
			tools.css('pointer-events', '');
		}, 500);
	}
	
	if (file.type && !file.type.match(/image.*/)) {
		if(conf.thumbnail && pdf24.isPdfFile(file)) {
			pdf24.getPdfJsDocumentForFile(file, function(pdfDoc) {
				var numPages = pdfDoc.numPages;
				if(numPages <= 0) {
					return;
				}
				
				var numPagesDetailSpan = $('<span data="data-dz-pages" />');
				var numPagesDetail = $('<div class="dz-pages" />');
				numPagesDetail.append(numPagesDetailSpan);
				pe.find('.dz-size').before(numPagesDetail);
				if(numPages > 1) {
					numPagesDetailSpan.text(numPages + ' pages');
				} else {
					numPagesDetailSpan.text('1 page');
				}
				
				pdfDoc.getPage(1).then(function(pdfPage) {
					var previewImgBox = pe.find('.dz-image');
					var viewport0 = pdfPage.getViewport({ scale : 1 });
					var scale1 = previewImgBox.height() / viewport0.height;
					var scale2 = previewImgBox.width() / viewport0.width;
					var scale = Math.min(scale1, scale2);						
					var dpr = window.devicePixelRatio || 1;
					var viewport = pdfPage.getViewport({ scale : scale * dpr });
					var canvas = document.createElement('canvas');
					canvas.height = viewport.height;
					canvas.width = viewport.width;
												
					var ctx = canvas.getContext('2d');
					var renderCtx = {
						canvasContext: ctx,
						viewport: viewport
					};
					
					pdfPage.render(renderCtx).promise.then( function() {
						ctx.globalCompositeOperation = 'destination-over';
						ctx.fillStyle = "#fff";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						var dataUrl = canvas.toDataURL();
						dz.emit("thumbnail", file, dataUrl);
					});
				});
			});
		}
	}
		
	pdf24.tippyTitles(pe);
};

pdf24.dropzoneFileRemoved = function(file, conf) {
	conf = conf || {};
	
	if(conf.elementsWithServerFile) {
		if(!Array.isArray(conf.elementsWithServerFile)) {
			conf.elementsWithServerFile = [conf.elementsWithServerFile];
		}
		conf.elementsWithServerFile.forEach(function(selector) {
			$(selector).each(function(index, elem) {
				var fsf1 = file.serverFile;
				var fsf2 = fsf1.pdfFile;
				var sf = $(elem).data('serverFile');
				if(pdf24.isSameServerFile(fsf1, sf) || pdf24.isSameServerFile(fsf2, sf)) {
					$(elem).remove();
				}
			});
		});
	}
};

/*
$(function() {
	setTimeout(function() {
		var pageId = pdf24.getPageId();
		if(['jobMonitor'].contains(pageId)) {
			return;
		}
		var pageLang = pdf24.getPageLang();
		var userLang = pdf24.getUserLang();
		if(pageLang == userLang) {
			return;
		}
		pdf24.trackPageEvent('UI', 'LangMismatch', 'page=' + pageLang + ', user=' + userLang);
	}, 500);
});
*/
