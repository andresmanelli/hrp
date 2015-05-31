/**
 * Testing the protocol timing
 */

var HRP = require('../hrp.js');

describe('Testing protocol timings',function(){

	describe('Testing isHRP timing',function(){
		var test = HRP('virtual',6666,false);
		var timeout = test.timeout;

		var clock = sinon.useFakeTimers();
		var p = test.isHRP();

		it('isHRP should not resolve at '+timeout/2+' ms',function(){				
			clock.tick(timeout/2);
			return p.should.not.be.resolved;
		});

		it('isHRP should not resolve at '+(timeout-1)+' ms',function(){
			clock.tick(timeout-timeout/2-1);
			return p.should.not.be.resolved;
		});

		it('isHRP should be fullfilled with false at '+timeout+' ms',function(){
			clock.tick(1);
			return p.should.eventually.equal(false);
		});
		
		clock.restore();
	});
});