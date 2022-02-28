//'use strict';

window.pdf24 = window.pdf24 || {};

pdf24.createPdfViewer0 = function(conf) {
	var viewer = {
		devicePixelRatio : 1, //window.devicePixelRatio || 1,
		jtarget : $('#' + conf.targetId),
		pageScale : 0,
		pdfDoc : null,
		currentPage : {
			pageNum : 0,
			scale : null,
			pdfPage : null,
			wrapper : null
		},
		isMovePageMode : false,
		uiTools : []
	};

	var validatePage = function(page, numPages) {
		if(page < 1) {
			return 1;
		}
		if(page >= numPages) {
			return numPages;
		}
		return page;
	};

	viewer.loadFile = function(fileUrl, callback) {
		callback = callback || function() {};
		pdf24.pdfjs.disableFontFace = false;
		pdf24.pdfjs.getDocument(
			{


				        // cMapPacked: !0,
				        // disableStream: !0,
				        // disableAutoFetch: !0,
				        // enableXfa: !1

			url : fileUrl,
			//cMapUrl : '/static/js/pdfjs/cmaps/',
			cMapPacked : true,
			enableXfa: false,

			// cMapPacked: true,
			//cMapUrl: "https://unpkg.com/browse/pdfjs-dist@2.12.313/cmaps/",
			//cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.12.313/cmaps/",
			cMapUrl: "https://www.sejda.com/js/pdfjs/web/cmaps/",
			disableAutoFetch: true,
			// disableFontFace: false,
			// disableRange: false,
			disableStream: true,
			// docBaseUrl: "",
			// enableXfa: true,
			// fontExtraProperties: false,
			// isEvalSupported: true,
			// maxImageSize: -1,
			// pdfBug: false,
			// standardFontDataUrl: "https://www.sejda.com/fonts/",
			//url: "compressed.tracemonkey-pldi-09.pdf",
			//verbosity: 1,
		}
	).promise.then(function(pdfDoc) {
			viewer.fileUrl = fileUrl;
			viewer.pdfDoc = pdfDoc;
			viewer.currentPage.pageNum = 1;
			viewer.currentPage.pdfPage = null;
			viewer.currentPage.wrapper = null;
			$(viewer).trigger('fileLoaded', pdfDoc);
			callback(pdfDoc);
		});
	};

	viewer.update = function() {
		if(!viewer.updateTimeout) {
			viewer.updateTimeout = setTimeout(function() {
				viewer.updateTimeout = null;
				viewer.showPage(viewer.currentPage.pageNum);
			}, 25);
		}
	};

	viewer.bindHandTool = function(canvas) {
		var currentX, currentY;
		var clicked = false;
		var updateScrollPos = function(e) {
			var obj = viewer.jtarget;
			obj.scrollLeft(obj.scrollLeft() + currentX - e.pageX);
			obj.scrollTop(obj.scrollTop() + currentY - e.pageY);
			currentX = e.pageX;
			currentY = e.pageY;
		};

		$(canvas).on({
			'mousemove': function(e) {
				if(viewer.isMovePageMode) {
					clicked && updateScrollPos(e);
					$(canvas).css('cursor', 'grabbing');
				}
			},
			'mousedown': function(e) {
				if(viewer.isMovePageMode) {
					clicked = true;
					currentX = e.pageX;
					currentY = e.pageY;
				}
			},
			'mouseup': function(e) {
				clicked = false;
				$('html').css('cursor', 'auto');
			}
		});
	};

	viewer.scalePage = function(factor) {
		viewer.setPageScale(viewer.pageScale * factor);
	};

	viewer.setPageScale = function(pageScale) {
		viewer.pageScale = pageScale;
		viewer.update();
	};

	viewer.goPage = function(number) {
		viewer.setPage(viewer.currentPage.pageNum + number);
	}

	viewer.setPage = function(page) {
		viewer.showPage(page);
	};

	var uiTools = {
		isCurrentPage : function() {
			return viewer.currentPage.wrapper != null;
		},
		scaleUp : function(o) {
			o.click(function() {
				viewer.scalePage(1.25);
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage
			};
		},
		scaleDown : function(o) {
			o.click(function() {
				viewer.scalePage(0.85);
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage
			};
		},
		prevPage : function(o) {
			o.click(function() {
				viewer.goPage(-1);
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage
			};
		},
		nextPage : function(o) {
			o.click(function() {
				viewer.goPage(1);
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage
			};
		},
		selectPage : function(o) {
			var updateOptions = function() {
				if(viewer.pdfDoc) {
					o.empty();
					for(var i=0; i < viewer.pdfDoc.numPages; i++) {
						o.append($('<option>', {
						    value: i + 1,
						    text : i + 1
						}));
					}
				}
			};
			updateOptions();
			$(viewer).on('fileLoaded', function(pdfDoc) {
				updateOptions();
			});
			o.on('change', function() {
				viewer.setPage(parseInt(o.val()));
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage,
				update: function() {
					o.val(viewer.currentPage.pageNum);
				}
			};
		},
		currentPage : function(o) {
			o.click(function() {
				viewer.goPage(1);
			});
			return {
				obj: o,
				isEnabled: true,
				update: function() {
					o.text(viewer.currentPage.pageNum);
				}
			};
		},
		movePage : function(o) {
			o.click(function() {
				viewer.isMovePageMode = !viewer.isMovePageMode;
				viewer.updateUiTools();
				$(viewer).trigger('movePageToolToggle', viewer.isMovePageMode);
			});
			$(viewer).on('disableMovePageTool', function(e) {
				if(viewer.isMovePageMode) {
					o.trigger('click');
				}
			});
			return {
				obj: o,
				isEnabled: this.isCurrentPage,
				update: function() {
					o.toggleClass('down', viewer.isMovePageMode)
				}
			};
		},
	};

	viewer.bindTools = function(selector) {
		$(selector).each(function() {
			var o = $(this);
			var role = o.data('role');
			if(role && uiTools[role]) {
				var tool = uiTools[role](o);
				if(tool) {
					viewer.uiTools.push(tool);
				}
			}
		});
		viewer.updateUiTools();
	};

	viewer.doUpdateUiTools = function(uiTools) {
		var updateTool = function(uiTool) {
			// enable/disabled
			var enabled = false;
			if(uiTool.isEnabled) {
				enabled = true;
				if(typeof uiTool.isEnabled === "function") {
					enabled = uiTool.isEnabled();
				}
			}
			uiTool.obj.toggleClass('disabled', !enabled);

			// update
			if(enabled && uiTool.update) {
				uiTool.update();
			}
		};

		// normal tools first
		for(var i=0; i<uiTools.length; i++) {
			if(!uiTools[i].group) {
				updateTool(uiTools[i]);
			}
		}

		// groups after normal tools
		for(var i=0; i<uiTools.length; i++) {
			if(uiTools[i].group) {
				updateTool(uiTools[i]);
			}
		}
	};

	viewer.updateUiTools = function() {
		viewer.doUpdateUiTools(viewer.uiTools);
	};

	viewer.clearPage = function() {
		if(viewer.currentPage.wrapper) {
			$(viewer).trigger('beforePageClear', viewer.currentPage);
			viewer.jtarget.empty();
		}
		viewer.currentPage.wrapper = null;
	};









	// viewer.showPageNew = async function(pageNum){
	//
	//
	// 	const eventBus = new pdfjsViewer.EventBus();
	// 	var PAGE_TO_VIEW = pageNum;
	// 	var SCALE = 1;
	//
	// 	const pdfPage = await viewer.pdfDoc.getPage(PAGE_TO_VIEW);
	// 	var viewport = pdfPage.getViewport({ scale: SCALE });
	//
	// 	var wrapper = $('<div id="pageContainer" class="pageCanvasWrapper"/>');
	// 	wrapper.css('display', 'inline-block').css('position','relative');
	// 	wrapper.css('width', (viewport.width/viewer.devicePixelRatio) + 'px');
	// 	wrapper.css('height', (viewport.height/viewer.devicePixelRatio) + 'px');
	// 	wrapper.data('page', pageNum);
	// 	viewer.jtarget.append(wrapper);
	// 	const container = document.getElementById("pageContainer");
	// 	//var container = wrapper;
	// 	const pdfPageView = new pdfjsViewer.PDFPageView({
	// 		container,
	// 		id: PAGE_TO_VIEW,
	// 		scale: SCALE,
	// 		defaultViewport: viewport,
	// 		eventBus,
	// 		// We can enable text/annotation/xfa/struct-layers, as needed.
	// 		textLayerFactory: !viewer.pdfDoc.isPureXfa
	// 			? new pdfjsViewer.DefaultTextLayerFactory({enhanceTextSelection:true})
	// 			: null,
	// 		textLayerMode:TextLayerMode.ENABLE_ENHANCE,
	// 		annotationLayerFactory: new pdfjsViewer.DefaultAnnotationLayerFactory(),
	// 		xfaLayerFactory: viewer.pdfDoc.isPureXfa
	// 			? new pdfjsViewer.DefaultXfaLayerFactory({
	// 				enhanceTextSelection:true
	// 			})
	// 			: null,
	// 		structTreeLayerFactory: new pdfjsViewer.DefaultStructTreeLayerFactory(),
	// 	});
	// 	// Associate the actual page with the view, and draw it.
	// 	pdfPageView.setPdfPage(pdfPage);
	// 	await pdfPageView.draw();
	//
	// 	viewer.currentRenderTask = null;
	// 	viewer.currentPage.wrapper = wrapper;
	// 	viewer.currentPage.pageNum = pageNum;
	// 	viewer.currentPage.pdfPage = pdfPage;
	// 	viewer.currentPage.scale = SCALE;
	// 	viewer.currentPage.viewport = viewport;
	//
	// 	//$(viewer).trigger('pageShown', viewer.currentPage);
	//
	// }
	viewer.parseTransform = function(s){
	  var keys = ['matrix3d', 'matrix', 'perspective', 'rotate3d', 'rotateX', 'rotateY', 'rotateZ', 'rotate', 'translate3d', 'translateX', 'translateY', 'translateZ', 'translate', 'scale3d', 'scaleX', 'scaleY', 'scaleZ', 'scale', 'skewX', 'skewY',  'skew'];

	  return (s+'    ').replace(  new RegExp( '\\b' + keys.join('|') + '\\b','gi'), m => '    ' +m)
	  .split(')    ').reduce((acc, p) => {
	    p = p.trim()

	    var name = p.slice(0, p.indexOf('(')),
	        value = p.slice(p.indexOf('(') + 1, 999)

	    if(!p) return acc

	    if( acc[name] )
	      acc[name].push(value)
	    else
	      acc[name] = [value]

	    return acc
	  }, {})
	}
	viewer.isSameWithRange = function(a,b,f){
		return Math.abs(a-b)<= f;
	}
	viewer.sortingFn = function( a, b ) {
		if ( viewer.isSameWithRange(a.top,b.top,4) ){
			return a.left-b.left;
		}
		return a.top-b.top;
	}

	viewer.fontsWidthMap = [];
	viewer.getWidthByFont = function(font) {
        if (!viewer.fontsWidthMap[font]) {
            //var span = $('<span style="font-family:' + font + ';"> </span>');
						var span = $('#GFG_Span');
						span.css({"font-family":font});
            //$('body').append(span);
            var width = span.width();
            //span.remove();
            viewer.fontsWidthMap[font] = width;
        }
        return viewer.fontsWidthMap[font];
    }

		viewer.cleanUnicodeControlCharsAndSpaces = function(e) {
			var unicodeControlCharsRe = /[\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u037F-\u0383\u038B\u038D\u03A2\u0528-\u0530\u0557\u0558\u0560\u0588\u058B-\u058E\u0590\u05C8-\u05CF\u05EB-\u05EF\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB-\u07FF\u082E\u082F\u083F\u085C\u085D\u085F-\u089F\u08A1\u08AD-\u08E3\u08FF\u0978\u0980\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FC-\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0C00\u0C04\u0C0D\u0C11\u0C29\u0C34\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5A-\u0C5F\u0C64\u0C65\u0C70-\u0C77\u0C80\u0C81\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0D01\u0D04\u0D0D\u0D11\u0D3B\u0D3C\u0D45\u0D49\u0D4F-\u0D56\u0D58-\u0D5F\u0D64\u0D65\u0D76-\u0D78\u0D80\u0D81\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E86\u0E89\u0E8B\u0E8C\u0E8E-\u0E93\u0E98\u0EA0\u0EA4\u0EA6\u0EA8\u0EA9\u0EAC\u0EBA\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F5-\u13FF\u169D-\u169F\u16F1-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180F\u181A-\u181F\u1878-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191D-\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C80-\u1CBF\u1CC8-\u1CCF\u1CF7-\u1CFF\u1DE7-\u1DFB\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20BB-\u20CF\u20F1-\u20FF\u218A-\u218F\u23F4-\u23FF\u2427-\u243F\u244B-\u245F\u2700\u2B4D-\u2B4F\u2B5A-\u2BFF\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E3C-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u312E-\u3130\u318F\u31BB-\u31BF\u31E4-\u31EF\u321F\u32FF\u4DB6-\u4DBF\u9FCD-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA698-\uA69E\uA6F8-\uA6FF\uA78F\uA794-\uA79F\uA7AB-\uA7F7\uA82C-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C5-\uA8CD\uA8DA-\uA8DF\uA8FC-\uA8FF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9E0-\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAA7C-\uAA7F\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F-\uABBF\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE27-\uFE2F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF]/g;
    	return e.replace(unicodeControlCharsRe, "").replace(/[\u3000\u2003\u2002\u2005\u2006\u2000\u2009\u202F\u00A0]/g, " ").replace(/[\u0009\u200B\u2028\u200A\u000A]/g, "")
		}

	viewer.mergeSimilarTexts = function(){
			//return;
			//debugger;
			var elements = [];
			$('.textLayer div').each(function(index, htmlCurrentElement) {
				//debugger;
				currentElement = $(htmlCurrentElement);
				var transform = 1;
				if(htmlCurrentElement.style.transform){
					try{
						var transformVal = viewer.parseTransform(htmlCurrentElement.style.transform);
						transform = parseFloat(transformVal.scaleX[0]);
					}catch(error){

					}
				}

				var width = currentElement.width() * transform;
				var height = currentElement.height();
				var position = currentElement.position();

				if((height > 2 * width) && (currentElement.text().length > 1)){
					currentElement.addClass('not-editable');
				}
				if(currentElement.attr('data-angle') !== 0){
					currentElement.addClass('not-editable');
				}

				if(currentElement.text() == ' '){
					currentElement.remove();
					return;
				}
				currentElement.css({"width": width, "overflow": "hidden","transform":"none"});

				elements.push({
                'top': position.top,
                'bottom': position.top + height,
                'left': position.left,
                'right': position.left + width,
                'height': height,
                'width': width,
                'scaleX': transform,
                'text': currentElement.html(),
                'fontFace': currentElement.attr("data-font-face"),
                'font': currentElement.attr("data-font") || '',
                'color': currentElement.attr("data-font-color") || '',
                'node': currentElement
            });
				// var trimmedText = currentElement.text().trim();
				// var isForm = trimmedText.contains('___') || trimmedText.contains('....') || trimmedText.contains('---');
        // if (isForm) {
				// 	currentElement.addClass('pseudo-form-field');
				// 	//var text = currentElement.text().replaceAll('_');// and others;
				// 	//currentElement.html(text);
        // }

			});

			elements.sort( viewer.sortingFn );

			var first;
			elements.forEach((second, i) => {

					if(first){

						var isTopSame = viewer.isSameWithRange(first.top,second.top,1);

						var isTopSameAvg = viewer.isSameWithRange(first.top,second.top,4);

						var isMinorGap = viewer.isSameWithRange(first.right,second.left, first.height) || second.left < first.right;

						var isFontFaceEqual = second.fontFace === first.fontFace;

						var isColorNotEqual = '' !== second.color && '' !== first.color && second.color !== first.color;

						var isTotalOverlap = isTopSame && viewer.isSameWithRange(first.left,second.left,1) && viewer.isSameWithRange(first.height,second.height,1) && viewer.isSameWithRange(first.width,second.width,1)

						var isTextSame = first.text === second.text;

						var isIncludeNoto = second.font.toLowerCase().includes('noto') || second.font.toLowerCase().includes('noto');

						var isHightEqual = first.height === second.height;

						var isHightEqualAvg = viewer.isSameWithRange(first.height,second.height,4);

						var isLengthEmpty = viewer.cleanUnicodeControlCharsAndSpaces(second.text.trim()).length === 0;

						if(isTotalOverlap && isTextSame){
							second.node.remove();
						}

						if( isColorNotEqual || !isFontFaceEqual ){
							first = second;
							return;
						}

						if(
							(isLengthEmpty) ||
							(isFontFaceEqual && isTopSame && isMinorGap) ||
							(isMinorGap && isHightEqual && isIncludeNoto && isTopSameAvg) ||
							(isMinorGap && isTopSameAvg && isHightEqualAvg)
						 ){

							if( (first.right + viewer.getWidthByFont(first.fontFace)) < second.left ) {
								first.node.append(' ');
							}

							first.node.append(second.node.html());
							second.node.remove();
							first.node = $(first.node);

							if(second.right > first.left){
									var newWidth = second.right - first.left;
									first.width = Math.max(first.width, newWidth);
							}
							first.height = Math.max(first.height,second.height);

							if(second.right > first.right){
								first.right = second.right;
							}

							first.node.css({'width': first.width});
							first.text = first.node.text();


						} else {
							first = second;
							return;
						}


					} else {
						first = second;
					}

			});


	}





	viewer.showPage = function(pageNum) {
		if(viewer.currentRenderTask) {
			viewer.currentRenderTask._internalRenderTask.cancel();
			viewer.currentRenderTask = null;
		}

		pageNum = validatePage(pageNum, viewer.pdfDoc.numPages);

		//viewer.showPageNew(pageNum);
		//return;

		viewer.pdfDoc.getPage(pageNum).then(function(pdfPage) {
			if(viewer.pageScale <= 0) {
				viewer.pageScale = 1;
				var tw = viewer.jtarget.innerWidth();
				var vp = pdfPage.getViewport({ scale : 1.0 });
				viewer.pageScale =  tw / vp.width; //tw * 0.95 / vp.width
			}
			var usePageScale = viewer.pageScale;
			var scale = viewer.pageScale * viewer.devicePixelRatio;
			//debugger;
			var viewport = pdfPage.getViewport({ scale : scale });
			var canvas = document.createElement('canvas');
			canvas.height = viewport.height;
			canvas.width = viewport.width;
			var ctx = canvas.getContext('2d');
			var renderCtx = {
				canvasContext: ctx,
				viewport: viewport
			};
			var renderTask = pdfPage.render(renderCtx);

			viewer.currentRenderTask = renderTask;
			renderTask.promise.then(function() {
				//debugger;
				if(viewer.pageScale != usePageScale) {
					return;
				}

				ctx.globalCompositeOperation = 'destination-over';
				ctx.fillStyle = "#fff";
				ctx.fillRect( 0, 0, canvas.width, canvas.height );

				viewer.clearPage();
				viewer.bindHandTool(canvas);

				$(canvas).css('width','100%').css('height','100%');
				$(canvas).attr('id', 'pdf_canvas');

				var textLayer = $('<div class="textLayer" id="gtextLayer"></div>');
				textLayer.css('width','100%').css('height','100%');//.css('z-index',10);

				var wrapper = $('<div class="pageCanvasWrapper"/>');
				//wrapper.css('display', 'inline-block').css('position','relative');
				wrapper.css('width', (viewport.width/viewer.devicePixelRatio) + 'px');
				wrapper.css('height', (viewport.height/viewer.devicePixelRatio) + 'px');
				wrapper.append(canvas);
				wrapper.append(textLayer);
				wrapper.data('page', pageNum);

				viewer.currentRenderTask = null;
				viewer.jtarget.append(wrapper);
				//viewer.jtarget.append(textLayer);

				viewer.currentPage.wrapper = wrapper;
				viewer.currentPage.pageNum = pageNum;
				viewer.currentPage.pdfPage = pdfPage;
				viewer.currentPage.scale = scale;
				viewer.currentPage.viewport = viewport;


			}).then(function() {
      // Returns a promise, on resolving it will return text contents of the page
      return pdfPage.getTextContent();
    }).then(function(textContent) {

			//debugger;
      // Assign CSS to the textLayer element
      var textLayer = document.querySelector(".textLayer");

      textLayer.style.left = canvas.offsetLeft + 'px';
      textLayer.style.top = canvas.offsetTop + 'px';
      textLayer.style.height = canvas.offsetHeight + 'px';
      textLayer.style.width = canvas.offsetWidth + 'px';

      // Pass the data to the method for rendering of text over the pdf canvas.
      return pdf24.pdfjs.renderTextLayer({
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
				enhanceTextSelection: true,
        textDivs: []
			});
			//debugger;

				//$(viewer).trigger('pageShown', viewer.currentPage);
				//viewer.mergeSimilarTexts();
		}).then(function(textContent) {
				$(viewer).trigger('pageShown', viewer.currentPage);
				viewer.mergeSimilarTexts();
		}).catch(function(e) {
				console.log(e);
				debugger;
				// skip, could be render canceled exception
			});
		});
	};

	$(viewer).on('pageShown', function(ev, p) {
		viewer.updateUiTools();
	});

	viewer.jtarget.on('mousewheel', function(evt) {
		if(evt.originalEvent && evt.originalEvent.ctrlKey) {
			if(evt.originalEvent.wheelDelta < 0) {
				viewer.scalePage(0.95);
			} else {
				viewer.scalePage(1.05);
			}
			evt.originalEvent.preventDefault();
			evt.originalEvent.stopPropagation();
		}
	});




	return viewer;
};

pdf24.createPdfViewer = function(conf, callback) {
	callback = callback || function() {};
	pdf24.requirePdfJs(function(pdfjs) {
		var viewer = pdf24.createPdfViewer0(conf);
		if(conf.fileUrl) {
			viewer.loadFile(conf.fileUrl, function() {
				callback(viewer);
			});
		} else {
			callback(viewer);
		}
	});
};
