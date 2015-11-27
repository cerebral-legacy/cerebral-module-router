// CLEANUP
['addressbar', './../index.js'].forEach(function(module){
    delete require.cache[require.resolve(module)];
});
delete global.window;
delete global.document;
delete global.history;
delete global.addEventListener;

// SETUP
var Controller = require('cerebral');
var Model = require('cerebral-baobab');
var Router = require('./../index.js');

module.exports['should work in node.js'] = function(test){
    var controller = Controller(Model({}));
    controller.signal('test', [
        function checkAction(input) {
            test.ok(true);
        }
    ]);

    var router = Router(controller, {
        '/test': 'test'
    });

    router.trigger('/test');
    router.detach();

    test.expect(1);
    test.done();
};
