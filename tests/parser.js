'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    requireNew = require('require-new');

describe('Gitdown.Parser', function () {
    var Parser,
        parser,
        spy;
    beforeEach(function () {
        Parser = requireNew('./../src/').Parser;
        parser = Parser();
    });
    afterEach(function () {
        if (spy) {
            spy.restore();
        }
    });
    it('returns the input content', function () {
        return parser
            .play('foo')
            .then(function (state) {
                expect(state.markdown).to.equal('foo');
            });
    });
    it('ignores content starting with a <!-- gitdown: off --> HTML comment tag', function () {
        return parser
            .play('{"gitdown": "test"}<!-- gitdown: off -->{"gitdown": "test"}')
            .then(function (state) {
                expect(state.markdown).to.equal('test<!-- gitdown: off -->{"gitdown": "test"}');
            });
    });
    it('ignores content between <!-- gitdown: off --> and <!-- gitdown: on --> HTML comment tags', function () {
        return parser
            .play('<!-- gitdown: off -->{"gitdown": "test"}<!-- gitdown: on --><!-- gitdown: off -->{"gitdown": "test"}<!-- gitdown: on -->')
            .then(function (state) {
                expect(state.markdown).to.equal('<!-- gitdown: off -->{"gitdown": "test"}<!-- gitdown: on --><!-- gitdown: off -->{"gitdown": "test"}<!-- gitdown: on -->');
            });
    });
    it('interprets JSON starting with \'{"gitdown"\' and ending with \'}\'', function () {
        return parser
            .play('{"gitdown": "test"}{"gitdown": "test"}')
            .then(function (state) {
                expect(state.markdown).to.equal('testtest');
            });
    });
    it('throws an error if invalid Gitdown JSON hook is encountered', function () {
        return expect(function () {
            parser.play('{"gitdown": invalid}');
        }).to.throw(Error, 'Invalid Gitdown JSON ("{"gitdown": invalid}").');
    });
    it('invokes a helper function with the markdown', function () {
        spy = sinon.spy(parser.helpers().test, 'compile');

        return parser
            .play('{"gitdown": "test", "foo": "bar"}')
            .then(function () {
                expect(spy.calledWith({foo: 'bar'})).to.be.equal(true);
            });
    });
    it('throws an error if an unknown helper is invoked', function () {
        return expect(function () {
            parser
                .play('{"gitdown": "does-not-exist"}');
        }).to.throw(Error, 'Unknown helper "does-not-exist".');
    });
    it('descends to the helper with the lowest weight after each iteration', function () {
        parser = Parser({
            getConfig: function () {
                return {
                    baseDirectory: __dirname
                };
            }
        });

        // Helper "include" is weight 20
        // Helper "test" is weight 10
        return parser
            .play('{"gitdown": "include", "file": "./fixtures/include_test_weight_10.txt"}')
            .then(function (state) {
                expect(state.markdown).to.equal('test');
            });
    });
});

describe('Parser.helpers', function () {
    var glob = require('glob'),
        path = require('path');

    glob.sync('./../src/helpers/*.js').forEach(function (helperName) {
        var helper = require(helperName);

        describe(path.basename(helperName, '.js'), function () {
            it('has compile method', function () {
                expect(helper).to.have.property('compile');
            });
            it('has weight property', function () {
                expect(helper).to.have.property('weight');
            });
        });
    });
});
