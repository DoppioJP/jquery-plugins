 /*
 * Tagify
 * Copyright 2011 Apps In Your Pants Corporation
 * http://github.com/appsinyourpants/jquery-plugins - Version 1.0 Jan. 21, 2010
 *
 * Version 1.0.1   -   Updated: Jan. 29, 2011 by JjP
 * - added all tags functionality
 *
 * Version 1.0.2   -   Updated: Jan. 29, 2011 by JjP
 * - added all tags button with additional allTagsButtonClass option to define additional css class for it
 * - changed function name from showAllData to showAllTags
 * - added function toggleAllTags to show and hide the tags list
 * 
 *
 * This jQuery plug-in is lcensed under a Creative Commons Attribution 3.0 Unported License. http://creativecommons.org/licenses/by/3.0/
 */

(function($) {
	$.fn.tagify = function() {
		var defaults = {
			data: [],
			staticdata: [],
			queryParam: "q",
			matchCase: false,
			minChars: 1,
			keyDelay: 100,
			start: function() { },
			format: highlighQuery,
			allowNew: true,
			newMatch: function(val) { return val.match(/^(\w+\-)*\w+$/gi); },
			containerType: 'div',
			sizeResults: null,
			allTagsButtonClass: 'text_shadow'
		};
		var opts = $.extend(defaults, arguments[0] || {});

		function highlighQuery(value, q) {
			return value.replace(q, '<b>' + q + '</b>');
		}

		this.each(function() {
			if (this.tagify) return;
			this.tagify = true;

			var lastQ;
			var pendingQ;
			var lastData;
			var resultsVisible;

			var input = $(this);
			var keyTimeout = null;

			var container = $('<' + opts.containerType + ' class="tagify-container" />');
			input.after(container);
			
			// Button to show all tags available
			var show_all_button = $('<a name="all_tags" class="tagify-all-button">+</a>')

			// Hide the original input
			input.hide();
			var id = this.id || this.name;


			// Create tag display
			var tags = $('<ul id="tags-' + id + '" class="tagify-tags"></ul>');
			container.append(tags);
			
			// Create a helper input that will be used only for entering tags
			var tag_input = $('<input type="text" class="tagify-prompt" autocomplete="off" />');
			tag_input.blur(function() { hideResults(); container.removeClass('focused'); });
			tag_input.focus(function() { container.addClass('focused'); });
			tag_input.blur();

			tags.append(tag_input);
			tag_input.wrap('<li />');


			// Create tag results list
			var results = $('<ul id="results-' + id + '" class="tagify-results ' + opts.allTagsButtonClass + '"></ul>')
				.css({
					position: 'absolute',
					zIndex: 10000
				});
			tags.after(results);

			container.click(function() { tag_input.focus(); });

			// Populate with existing values
			var existing = input.val().split(',');
			input.val('');
			for (var ix = 0; ix < existing.length; ix++)
				addTag(existing[ix]);


			tag_input.keydown(function(evt) {
				switch (evt.keyCode) {
					case 40: //down
						showResults();
						nextResult();
						break;
					case 38: // Up
						previousResult();
						break;
					case 27: // Esc
						if (tag_input.val() === '')
							tag_input.blur();
						if (resultsVisible)
							hideResults();
						else
							tag_input.val('');
						break;
					case 9:
						// Allow tab nabigation to previous form field
						if (evt.shiftKey || evt.ctrlKey || evt.altKey)
							return;
						// Allow tab navigation to next form field
						if (tag_input.val() === '')
							return;
						addSelectedResult(true);
						break;
					case 13: // Enter
						if (tag_input.val() === '')
							return;
						addSelectedResult(!opts.allowNew);
						break;
					case 8:
						// Delete last tag if input is empty,
						if (tag_input.val() === '') {
							removeTag($('li:last', tags).prev());
							hideResults();
							break;
						}
						return defaultKeyHandler();
					case 32:
						// Show all available tags
						showAllTags();
						return;
					default:
						defaultKeyHandler();
						return;
				}

				evt.preventDefault();
			});

			// Add the all button
			container.append(show_all_button);
			show_all_button.click(function() { 
				toggleAllTags();
				return false;
			})


			function defaultKeyHandler() {
				if (keyTimeout) clearTimeout(keyTimeout);
				keyTimeout = setTimeout(function() { keyChanged(); keyTimeout = null; }, opts.keyDelay);
			}

			function keyChanged() {
				if (pendingQ) return;
				var q = $.trim(tag_input.val());

				if (!shouldProcessQuery(q)) {
					if (lastData)
						processData(lastData, q);
					return;
				}

				if (opts.url) {
					pendingQ = true;
					$.getJSON(appendTimestamp(opts.url + '?q=' + encodeURIComponent(q)), function(data) {
						processData(data, q);
					});
				}
				else {
					processData(opts.data, tag_input.val());
				}
			}
			
			function toggleAllTags() {
				if (resultsVisible)
					hideResults();
				else 
					showAllTags();
			}

			function showAllTags() {
				
				// Count items to show
				var showCount = 0;
				
				// Empty results first
				results.empty();
				
				// Merge data collection with staticdata to work on both together
				var merged = $.merge($.merge([], opts.data), opts.staticdata);
				
				// Iterate through merged collection 
				for (var ix = 0; ix < merged.length; ix++) {
					
					// Take the item value and trim it
					var value = merged[ix];
					value = $.trim(value);
					
					// Create a tag on comma
					if (input.val().indexOf(value + ',') > -1)
						continue;

					var result_item = $('<li>' + value + '</li>');
					result_item.data('value', value);
					results.append(result_item);

					result_item.click(function() {
						addTag($(this).data('value'));
					});

					showCount++;
				}
				
				// Don't show the results collection container if there are no items
				if (showCount > 0)
					showResults();
				else
					hideResults();
				
			}

			function shouldProcessQuery(q) {
				q = q ? $.trim(q) : '';
				if (q.length < opts.minChars)
					return false;

				return !lastQ || q.indexOf(lastQ) < 0;
			}

			function processData(data, q) {
				pendingQ = false;
				lastData = data;
				lastQ = q;
				results.empty();

				q = q ? $.trim(q) : '';
				var showCount = 0;

				if (q.length >= opts.minChars) {
					var merged = $.merge($.merge([], data), opts.staticdata);
					for (var ix = 0; ix < merged.length; ix++) {
						var value = merged[ix];
						value = $.trim(value);
						if (!q || value.indexOf(q) > -1) {

							if (input.val().indexOf(value + ',') > -1)
								continue;

							var result_item = $('<li>' + opts.format(value, q) + '</li>');
							result_item.data('value', value);
							results.append(result_item);

							result_item.click(function() {
								addTag($(this).data('value'));
							});

							showCount++;
						}
					}
				}

				if (showCount > 0)
					showResults();
				else
					hideResults();
			}

			function addSelectedResult() {
				var cur = $('.selected', results);
				if (cur.length == 0) {
					if (arguments.length > 0 && arguments[0]) {
						nextResult();
						cur = $('.selected', results);
					}
					var val = tag_input.val();
					if (cur.length == 0 && val != '' && opts.allowNew) {
						if (opts.newMatch(val))
							addTag(tag_input.val());
						else
							return;
					}
				}
				if (cur.length > 0)
					addTag(cur.data('value'));

				tag_input.val('');
				hideResults();
				tag_input.focus();
			}


			function addTag(value) {
				value = $.trim(value);
				value = value.replace(',', '_');

				if (value.length > 0) {
					var displayName = arguments.length > 1 ? arguments[1] : value;
					input.val(input.val() + value + ',');

					var tag = $('<li class="tagify-tag"><span>' + displayName + '</span></li>').data('value', value);
					tag_input.parent().before(tag);
					var remove = $('<a>&times;</a>');
					tag.append(remove);

					remove.click(function() {
						removeTag($(this).parent());
					});
				}
			}

			function removeTag(tag) {
				var jt = $(tag);
				if (jt.length == 0) return;
				var value = jt.data('value');
				input.val(input.val().replace(value + ',', ''));
				tag.remove();
			}


			function previousResult() {
				var cur = $('.selected', results);
				results.children().removeClass('selected');
				if (cur.prev().length > 0)
					cur = cur.prev();
				else
					return;
				cur.addClass('selected');
			}

			function nextResult() {
				var cur = $('.selected', results);
				results.children().removeClass('selected');
				if (cur.length == 0)
					cur = $(results.children()[0]);
				else if (cur.next().length > 0)
					cur = cur.next();

				cur.addClass('selected');
			}

			function highlightResult(r) {
				$('li', results).removeClass('selected');
				$(r).addClass('selected');
			}

			function showResults() {
				if (results.children().length == 0) return;

				if (opts.sizeResults)
					opts.sizeResults(results);
				else {
					var parent = container.offsetParent();

					results.css({
						left: container.offset().left - parent.offset().left - (parent.outerWidth() - parent.width()) / 4,
						top: container.offset().top - parent.offset().top + container.outerHeight() - 1,
						width: container.outerWidth() - 8
					});
				}

				results.show();
				resultsVisible = true;
			}
			function hideResults() {
				resultsVisible = false;
				if (!results) return;
				results.slideUp('fast');
				results.empty();
				if (keyTimeout) clearTimeout(keyTimeout);
			}


		});

		return this;
	}
})(jQuery);