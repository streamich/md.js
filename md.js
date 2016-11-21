/*!
 *             __
 *   __ _  ___/ /
 *  /  ' \/ _  / 
 * /_/_/_/\_,_/ 
 * 
 * md.js is a lightweight markdown parser
 * https://github.com/thysultan/md.js
 * 
 * @licence MIT
 */
(function (factory) {
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define(factory());
	} else {
		window.md = factory();
	}
}(function () {
	var escapeQuotesRegExp = /"/g;
	var escapeQuotesTemplate = "'";

	var XSSFilterRegExp = /<(script)>([^]+?)<\/(script)>/gmi;
	var XSSFilterTemplate = '&lt;$1&gt;$2&lt;/$3&gt;';

	var XSSFilterInlineJSRegExp = /(<.*? .*?=.*?)(javascript:.*?)(.*>)/gmi;
	var XSSFilterInlineJSTemplate = '$1#$2&#58;$3';

	var removeTabsRegExp = /^[\t ]+|[\t ]$/gm;

	var htmlFilterRegExp = /(<.*>[\t ]*\n^.*)/gm;
	var htmlFilterTemplate = function (match, group1) { 
		return group1.replace(/^\n|$\n/gm, '');
	};

	var cssFilterRegExp = /(<style>[^]*<\/style>)/gm;
	var cssFilterTemplate = htmlFilterTemplate;

	var eventsFilterRegExp = /(<[^]+?)(on.*?=.*?)(.*>)/gm;
	var eventsFilterTemplate = '$1$3';

	var blockQuotesRegExp = /^.*?> (.*)/gm;
	var blockQuotesTemplate = '<blockquote>$1</blockquote>';

	var inlineCodeRegExp = /`([^`]+?)`/g;
	var inlineCodeTemplate = '<code>$1</code>';

	var blockCodeRegExp = /```(.*)\n([^]+)```(?!```)/gm;

	var imagesRegExp = /!\[(.*)\]\((.*)\)/g;
	var imagesTemplate = function (match, group1, group2) {
		var src = group2.replace(escapeQuotesRegExp, escapeQuotesTemplate);
		var alt = group1.replace(escapeQuotesRegExp, escapeQuotesTemplate);

		return '<img src="'+src+'" alt="'+alt+'">';
	};

	var headingsRegExp = /^(#+) +(.*)/gm;
	var headingsTemplate = function (match, hash, content) {
		var length = hash.length; return '<h'+length+'>'+content+'</h'+length+'>';
	};

	var headingsCommonh2RegExp = /^([^\n\t ])(.*)\n----+/gm;
	var headingsCommonh1RegExp = /^([^\n\t ])(.*)\n====+/gm;
	var headingsCommonh1Template = '<h1>$1$2</h1>';
	var headingsCommonh2Template = '<h2>$1$2</h2>';

	var paragraphsRegExp = /^([^-><#\d\+\_\*\t\n\[\! \{])([^]*?)(|  )(?:\n\n)/gm;
	var paragraphsTemplate = function (match, group1, group2, group3) {
		var leadingCharater = group1;
		var body = group2;
		
		var trailingSpace = group3 ? '\n<br>\n' : '\n';
		return '<p>'+leadingCharater+body+'</p>'+trailingSpace;
	};

	var horizontalRegExp = /^.*?(?:---|\*\*\*|- - -|\* \* \*)/gm;
	var horizontalTemplate = '<hr>';

	var strongRegExp = /(?:\*\*|\_\_)([^\*\n_]+?)(?:\*\*|\_\_)/g;
	var strongTemplate = '<strong>$1</strong>';

	var emphasisRegExp = /(?:\*|\_)([^\*\n_]+?)(?:\*|\_)/g;
	var emphasisTemplate = '<em>$1</em>';

	var strikeRegExp = /(?:~~)([^~]+?)(?:~~)/g;
	var strikeTemplate = '<del>$1</del>';

	var linksRegExp = /\[(.*?)\]\(([^\t\n ]*)(?:| "(.*)")\)+/gm;
	var linksTemplate = function (match, group1, group2, group3) {
		var link = group2.replace(escapeQuotesRegExp, escapeQuotesTemplate);
		var text = group1.replace(escapeQuotesRegExp, escapeQuotesTemplate);
		var title = group3 ? ' title="'+group3.replace(escapeQuotesRegExp, escapeQuotesTemplate)+'"' : '';

		return '<a href="'+link+'"'+title+'>'+text+'</a>';
	};

	var listUlRegExp1 = /^[\t ]*?(?:-|\+|\*) (.*)/gm;
	var listUlRegExp2 = /(\<\/ul\>\n(.*)\<ul\>*)+/g;
	var listUlTemplate = '<ul><li>$1</li></ul>';

	var listOlRegExp1 = /^[\t ]*?(?:\d(?:\)|\.)) (.*)/gm;
	var listOlRegExp2 = /(\<\/ol\>\n(.*)\<ol\>*)+/g;
	var listOlTemplate = '<ol><li>$1</li></ol>';

	var lineBreaksRegExp = /^\n\n+/gm;
	var lineBreaksTemplate = '<br>';

	var checkBoxesRegExp = /\[( |x)\]/g;
	var checkBoxesTemplate = function (match, group1) {
		return '<input type="checkbox" disabled' + (group1.toLowerCase() === 'x' ? ' checked' : '') + '>'
	};


	/**
	 * markdown parser
	 * 
	 * @param  {string} markdown
	 * @return {string}
	 */
	return function md (markdown) {
		var code = [];
		var index = 0;
		var length = markdown.length;

		// to allow matching trailing paragraphs
		if (markdown[length-1] !== '\n' && markdown[length-2] !== '\n') {
			markdown += '\n\n';
		}

		// format, removes tabs, leading and trailing spaces
		markdown = (
			markdown
				// XSS script tags
				.replace(XSSFilterRegExp, XSSFilterTemplate)
				// filter events
				.replace(eventsFilterRegExp, eventsFilterTemplate)
				// collect code blocks and replace with placeholder
				// we do this to avoid code blocks matching the paragraph regexp
				.replace(blockCodeRegExp, function (match, lang, block) {
					var placeholder = '{code-block-'+index+'}';
					var regex = new RegExp('{code-block-'+index+'}', 'g');

					code[index++] = {lang: lang, block: block, regex: regex};

					return placeholder;
				})
				// tabs
				.replace(removeTabsRegExp, '')
				// blockquotes
				.replace(blockQuotesRegExp, blockQuotesTemplate)
				// inline code
				.replace(inlineCodeRegExp, inlineCodeTemplate)
				// images
				.replace(imagesRegExp, imagesTemplate)
				// headings
				.replace(headingsRegExp, headingsTemplate)
				// headings h1 (commonmark)
				.replace(headingsCommonh1RegExp, headingsCommonh1Template)
				// headings h2 (commonmark)
				.replace(headingsCommonh2RegExp, headingsCommonh2Template)
				// horizontal rule 
				.replace(horizontalRegExp, horizontalTemplate)
				// unorderd lists
				.replace(listUlRegExp1, listUlTemplate).replace(listUlRegExp2, '')
				// ordered lists
				.replace(listOlRegExp1, listOlTemplate).replace(listOlRegExp2, '')
				// checkboxes
				.replace(checkBoxesRegExp, checkBoxesTemplate)
				// filter html
				.replace(htmlFilterRegExp, htmlFilterTemplate)
				// filter css
				.replace(cssFilterRegExp, cssFilterTemplate)
				// paragraphs
				.replace(paragraphsRegExp, paragraphsTemplate)
				// links
				.replace(linksRegExp, linksTemplate)
				// strong
				.replace(strongRegExp, strongTemplate)
				// emphasis
				.replace(emphasisRegExp, emphasisTemplate)
				// strike through
				.replace(strikeRegExp, strikeTemplate)
				// line breaks
				.replace(lineBreaksRegExp, lineBreaksTemplate)
				// filter inline js
				.replace(XSSFilterInlineJSRegExp, XSSFilterInlineJSTemplate)
		);

		// replace code block placeholders
		for (var i = 0; i < index; i++) {
			var item = code[i];
			var lang = item.lang;
			var block = item.block;

			markdown = markdown.replace(item.regex, function (match) {
				return '<pre><code class="language-'+lang+'">'+block+'</code></pre>';
			});
		}

		return markdown.trim();
	}
}));