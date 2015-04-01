"use strict";

describe('test', function(){
  it('单元测试正常运行', function(){
    expect(true).toEqual(true);
  })
});

//describe('my awesome app', function()
//{
//  var _GreetingService;
//
//  beforeEach(module('splitBox'));
//
//  beforeEach(inject(function($injector)
//  {
//    _GreetingService = $injector.get('GreetingService');
//  }));
//
//  describe('sayHello', function()
//  {
//    it('should call the say hello function', function()
//    {
//      spyOn(_GreetingService, 'sayHello').and.callFake(angular.noop);
//
//      _GreetingService.sayHello();
//
//      expect(_GreetingService.sayHello).toHaveBeenCalled();
//    });
//
//    it('should say hello', function()
//    {
//        expect(_GreetingService.sayHello()).toEqual("hello there!");
//    });
//  });
//});
