"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

/**
* @file smartymixed.js
* @brief Smarty Mixed Codemirror mode (Smarty + Mixed HTML)
* @author Ruslan Osmanov <rrosmanov at gmail dot com>
* @version 3.0
* @date 05.07.2013
*/

// Warning: Don't base other modes on this one. This here is a
// terrible way to write a mixed mode.

(function (mod) {
  if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) == "object" && (typeof module === "undefined" ? "undefined" : _typeof(module)) == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("../htmlmixed/htmlmixed"), require("../smarty/smarty"));else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "../htmlmixed/htmlmixed", "../smarty/smarty"], mod);else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  CodeMirror.defineMode("smartymixed", function (config) {
    var htmlMixedMode = CodeMirror.getMode(config, "htmlmixed");
    var smartyMode = CodeMirror.getMode(config, "smarty");

    var settings = {
      rightDelimiter: '}',
      leftDelimiter: '{'
    };

    if (config.hasOwnProperty("leftDelimiter")) {
      settings.leftDelimiter = config.leftDelimiter;
    }
    if (config.hasOwnProperty("rightDelimiter")) {
      settings.rightDelimiter = config.rightDelimiter;
    }

    function reEsc(str) {
      return str.replace(/[^\s\w]/g, "\\$&");
    }

    var reLeft = reEsc(settings.leftDelimiter),
        reRight = reEsc(settings.rightDelimiter);
    var regs = {
      smartyComment: new RegExp("^" + reRight + "\\*"),
      literalOpen: new RegExp(reLeft + "literal" + reRight),
      literalClose: new RegExp(reLeft + "\/literal" + reRight),
      hasLeftDelimeter: new RegExp(".*" + reLeft),
      htmlHasLeftDelimeter: new RegExp("[^<>]*" + reLeft)
    };

    var helpers = {
      chain: function chain(stream, state, parser) {
        state.tokenize = parser;
        return parser(stream, state);
      },

      cleanChain: function cleanChain(stream, state, parser) {
        state.tokenize = null;
        state.localState = null;
        state.localMode = null;
        return typeof parser == "string" ? parser ? parser : null : parser(stream, state);
      },

      maybeBackup: function maybeBackup(stream, pat, style) {
        var cur = stream.current();
        var close = cur.search(pat),
            m;
        if (close > -1) stream.backUp(cur.length - close);else if (m = cur.match(/<\/?$/)) {
          stream.backUp(cur.length);
          if (!stream.match(pat, false)) stream.match(cur[0]);
        }
        return style;
      }
    };

    var parsers = {
      html: function html(stream, state) {
        var htmlTagName = state.htmlMixedState.htmlState.context && state.htmlMixedState.htmlState.context.tagName ? state.htmlMixedState.htmlState.context.tagName : null;

        if (!state.inLiteral && stream.match(regs.htmlHasLeftDelimeter, false) && htmlTagName === null) {
          state.tokenize = parsers.smarty;
          state.localMode = smartyMode;
          state.localState = smartyMode.startState(htmlMixedMode.indent(state.htmlMixedState, ""));
          return helpers.maybeBackup(stream, settings.leftDelimiter, smartyMode.token(stream, state.localState));
        } else if (!state.inLiteral && stream.match(settings.leftDelimiter, false)) {
          state.tokenize = parsers.smarty;
          state.localMode = smartyMode;
          state.localState = smartyMode.startState(htmlMixedMode.indent(state.htmlMixedState, ""));
          return helpers.maybeBackup(stream, settings.leftDelimiter, smartyMode.token(stream, state.localState));
        }
        return htmlMixedMode.token(stream, state.htmlMixedState);
      },

      smarty: function smarty(stream, state) {
        if (stream.match(settings.leftDelimiter, false)) {
          if (stream.match(regs.smartyComment, false)) {
            return helpers.chain(stream, state, parsers.inBlock("comment", "*" + settings.rightDelimiter));
          }
        } else if (stream.match(settings.rightDelimiter, false)) {
          stream.eat(settings.rightDelimiter);
          state.tokenize = parsers.html;
          state.localMode = htmlMixedMode;
          state.localState = state.htmlMixedState;
          return "tag";
        }

        return helpers.maybeBackup(stream, settings.rightDelimiter, smartyMode.token(stream, state.localState));
      },

      inBlock: function inBlock(style, terminator) {
        return function (stream, state) {
          while (!stream.eol()) {
            if (stream.match(terminator)) {
              helpers.cleanChain(stream, state, "");
              break;
            }
            stream.next();
          }
          return style;
        };
      }
    };

    return {
      startState: function startState() {
        var state = htmlMixedMode.startState();
        return {
          token: parsers.html,
          localMode: null,
          localState: null,
          htmlMixedState: state,
          tokenize: null,
          inLiteral: false
        };
      },

      copyState: function copyState(state) {
        var local = null,
            tok = state.tokenize || state.token;
        if (state.localState) {
          local = CodeMirror.copyState(tok != parsers.html ? smartyMode : htmlMixedMode, state.localState);
        }
        return {
          token: state.token,
          tokenize: state.tokenize,
          localMode: state.localMode,
          localState: local,
          htmlMixedState: CodeMirror.copyState(htmlMixedMode, state.htmlMixedState),
          inLiteral: state.inLiteral
        };
      },

      token: function token(stream, state) {
        if (stream.match(settings.leftDelimiter, false)) {
          if (!state.inLiteral && stream.match(regs.literalOpen, true)) {
            state.inLiteral = true;
            return "keyword";
          } else if (state.inLiteral && stream.match(regs.literalClose, true)) {
            state.inLiteral = false;
            return "keyword";
          }
        }
        if (state.inLiteral && state.localState != state.htmlMixedState) {
          state.tokenize = parsers.html;
          state.localMode = htmlMixedMode;
          state.localState = state.htmlMixedState;
        }

        var style = (state.tokenize || state.token)(stream, state);
        return style;
      },

      indent: function indent(state, textAfter) {
        if (state.localMode == smartyMode || state.inLiteral && !state.localMode || regs.hasLeftDelimeter.test(textAfter)) {
          return CodeMirror.Pass;
        }
        return htmlMixedMode.indent(state.htmlMixedState, textAfter);
      },

      innerMode: function innerMode(state) {
        return {
          state: state.localState || state.htmlMixedState,
          mode: state.localMode || htmlMixedMode
        };
      }
    };
  }, "htmlmixed", "smarty");

  CodeMirror.defineMIME("text/x-smarty", "smartymixed");
  // vim: et ts=2 sts=2 sw=2
});
//# sourceMappingURL=smartymixed.js.map