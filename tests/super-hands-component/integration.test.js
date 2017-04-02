/* global assert, process, setup, suite, test */

var helpers = require('../helpers'), 
    entityFactory = helpers.entityFactory;

suite('super-hands & reaction component integration', function () {
  setup(function (done) {
    this.target1 = entityFactory();
    this.target1.setAttribute('grabbable', '');
    this.target1.setAttribute('hoverable', '');
    this.target1.setAttribute('stretchable', '');
    this.target1.setAttribute('drag-droppable', '');
    this.target2 = document.createElement('a-entity');
    this.target2.setAttribute('drag-droppable', '');
    this.target2.setAttribute('hoverable', '');
    this.target1.parentNode.appendChild(this.target2);
    this.hand1 = helpers.controllerFactory({
      'super-hands': ''
    });
    this.hand2 = helpers.controllerFactory({
      'vive-controls': 'hand: left',
      'super-hands': ''
    }, true);
    this.hand1.parentNode.addEventListener('loaded', () => {
      this.sh1 = this.hand1.components['super-hands'];
      this.sh2 = this.hand2.components['super-hands'];
      done();
    });
  });
  test('grabbable', function () {
    this.sh1.onGrabStartButton();
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.strictEqual(this.sh1.carried, this.target1);
    assert.strictEqual(this.target1.components.grabbable.grabber, this.hand1);
    assert.ok(this.target1.is('grabbed'), 'grabbed');
    this.sh1.onGrabEndButton();
    assert.isFalse(this.target1.is('grabbed'), 'released');
    assert.notEqual(this.sh1.hoverEls.indexOf(this.target1), -1, 'still watched');
  });
  test('hoverable', function () {
    this.target1.addState('collided');
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.strictEqual(this.sh1.hoverEls[0], this.target1);
    assert.strictEqual(this.target1.components.hoverable.hoverers[0], this.hand1);
    assert.isTrue(this.target1.is('hovered'));
    this.target1.removeState('collided');
    assert.isFalse(this.target1.is('hovered'));
    assert.equal(this.sh1.hoverEls.indexOf(this.target1), -1);
  });
  test('stretchable', function () {
    this.sh1.onStretchStartButton();
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.isFalse(this.target1.is('stretched'));
    this.sh2.onHit({ detail: { el: this.target1 } });
    this.sh2.onStretchStartButton();
    assert.ok(this.target1.is('stretched'));
    assert.includeMembers(this.target1.components.stretchable.stretchers,
                         [this.hand1, this.hand2]);
    assert.strictEqual(this.sh1.stretched, this.target1);
    assert.strictEqual(this.sh2.stretched, this.target1);
    this.sh1.onStretchEndButton();
    assert.isFalse(this.target1.is('stretched'), 'hand 1 release');
    this.sh1.onStretchStartButton();
    assert.isTrue(this.target1.is('stretched'), 'resume stretch');
    this.sh2.onStretchEndButton(); 
    assert.isFalse(this.target1.is('stretched'), 'hand 2 release');
    this.sh1.onStretchEndButton();
    assert.equal(this.target1.components.stretchable.stretchers.length, 0);
  });
  test('drag-droppable', function () {
    var dropSpy = this.sinon.spy(),
        targetDropSpy = this.sinon.spy();
    this.target1.addEventListener('drag-drop', dropSpy);
    this.target2.addEventListener('drag-drop', targetDropSpy);
    this.sh1.onDragDropStartButton();
    this.sh1.onHit({ detail: { el: this.target1 } });
    this.sh1.onHit({ detail: { el: this.target2 } });
    assert.ok(this.target1.is('dragged'), 'carried dragged');
    assert.ok(this.target2.is('dragover'), 'drop target hovered');
    this.target2.emit('stateremoved', { state: 'collided' });
    assert.ok(this.target1.is('dragged'), 'carried still dragged after target lost');
    assert.isFalse(this.target2.is('dragover'), 'lost target unhovered');
    assert.isFalse(dropSpy.called, 'no drop before button release');
    this.sh1.onDragDropEndButton();
    assert.isFalse(dropSpy.called, 'no drop w/o target');
    assert.isFalse(this.target1.is('dragged'), 'drop w/o target: no longer dragged');
    this.sh1.onDragDropStartButton();
    assert.ok(this.target1.is('dragged'), 'dragged re-acquired');
    this.sh1.onHit({ detail: { el: this.target2 } });
    assert.ok(this.target2.is('dragover'), 'drop target re-acquired');
    this.sh1.onDragDropEndButton();
    assert.isTrue(targetDropSpy.called, 'drag-drop success: target');
    assert.isTrue(dropSpy.called, 'drag-drop success: hand');
    assert.isFalse(this.target1.is('dragged'), 'carried released');
    assert.isFalse(this.target2.is('dragover'), 'drop target unhovered');
  });
  test('lastHover not confused by rejected dragover', function () {
    this.target2.removeComponent('drag-droppable');
    this.sh1.onDragDropStartButton();
    this.sh1.onHit({ detail: { el: this.target1 } });
    this.sh1.onHit({ detail: { el: this.target2 } });
    assert.equal(this.sh1.lastHover, 'hover-start');
  });
  test('hover ends when target grabbed', function () {
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.ok(this.target1.is('hovered'), 'hover starts');
    this.sh1.onGrabStartButton();
    assert.ok(this.target1.is('grabbed'), 'grab starts');
    assert.notOk(this.target1.is('hovered'), 'hover ended');
    this.sh1.onGrabEndButton();
    assert.notOk(this.target1.is('grabbed'), 'grab ended');
    assert.ok(this.target1.is('hovered'), 'hover resumed');
  });
  test('hover ends when target dragged', function () {
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.ok(this.target1.is('hovered'), 'hover starts');
    this.sh1.onDragDropStartButton();
    assert.ok(this.target1.is('dragged'), 'drag starts');
    assert.notOk(this.target1.is('hovered'), 'hover ended');
    this.sh1.onDragDropEndButton();
    assert.notOk(this.target1.is('dragged'), 'drag ended');
    assert.ok(this.target1.is('hovered'), 'hover resumed');
  });
  test('hover ends when target stretched', function () {
    this.sh1.onHit({ detail: { el: this.target1 } });
    assert.ok(this.target1.is('hovered'), 'hover starts');
    this.sh1.onStretchStartButton();
    assert.notOk(this.target1.is('hovered'), 'hover ended');
    this.sh1.onStretchEndButton();
    assert.ok(this.target1.is('hovered'), 'hover resumed');
  });
});
suite('super-hands collider integration', function () {
  setup(function (done) {
    this.target1 = entityFactory();
    this.target1.id = 'target1';
    this.target1.setAttribute('geometry', 'primitive: sphere');
    this.target2 = document.createElement('a-entity');
    this.target2.id = 'target2';
    this.target2.setAttribute('geometry', 'primitive: sphere');
    this.target1.parentNode.appendChild(this.target2);
    this.hand1 = helpers.controllerFactory({
      'vive-controls': 'hand: right; model: false',
      geometry: 'primitive: sphere',
      'super-hands': '', 'sphere-collider': 'objects: #target1, #target2'
    }, true);
    this.hand2 = helpers.controllerFactory({
      'vive-controls': 'hand: left; model: false',
      geometry: 'primitive: sphere',
      'super-hands': '',
      'sphere-collider': 'objects: #target1, #target2'
    }, true);
    this.hand1.parentNode.addEventListener('loaded', () => {
      this.sh1 = this.hand1.components['super-hands'];
      this.col1 = this.hand1.components['sphere-collider'];
      this.sh2 = this.hand2.components['super-hands'];
      this.col2 = this.hand2.components['sphere-collider'];
      done();
    });
  });
  test('avoid excessive drag event dispatch', function () {
    var dragenterSpy = this.sinon.spy(),
        aFrameDragoverSpy = this.sinon.spy();
    this.target2.ondragenter = dragenterSpy;
    this.target2.addEventListener('dragover-start', aFrameDragoverSpy);
    this.target1.addEventListener('drag-start', e => e.preventDefault());
    this.target2.setAttribute('position', '10 10 10');
    // sphere collider not respecting position attribute changes
    this.target2.getObject3D('mesh').position.set(10, 10, 10);
    this.col1.tick();
    this.sh1.onDragDropStartButton();
    assert.isFalse(dragenterSpy.called, 'not yet collided');
    assert.isFalse(aFrameDragoverSpy.called, 'AF not yet collided');
    this.target2.setAttribute('position', '0 0 0');
    // sphere collider not respecting position attribute changes
    this.target2.getObject3D('mesh').position.set(0, 0, 0);
    this.col1.tick();
    assert.equal(dragenterSpy.callCount, 1, 'initial dragover');
    assert.equal(aFrameDragoverSpy.callCount, 1, 'AF initial dragover');
    this.col1.tick();
    assert.equal(dragenterSpy.callCount, 1, 'no duplicate dragover');
    assert.equal(aFrameDragoverSpy.callCount, 1, ' AF no duplicate dragover');
  });
  test('avoid excessive hover event dispatch', function () {
    var mouseoverSpy = this.sinon.spy(),
        aFrameHoverSpy = this.sinon.spy();
    // multiple targets cause justifiable event repetition, so limit to one
    this.col1.els = [this.target1]; 
    this.target1.onmouseover = mouseoverSpy;
    this.target1.addEventListener('hover-start', aFrameHoverSpy);
    this.target1.addEventListener('hover-start', e => e.preventDefault());
    this.col1.tick();
    assert.equal(mouseoverSpy.callCount, 1, 'mouseovered');
    assert.equal(aFrameHoverSpy.callCount, 1, 'hovered');
    this.col1.tick();
    assert.equal(mouseoverSpy.callCount, 1, 'no duplicate mouseover');
    assert.equal(aFrameHoverSpy.callCount, 1, ' AF no duplicate hover');
  });
  test('avoid excessive rejected event dispatch', function () {
    var grabSpy = this.sinon.spy(),
        stretchSpy = this.sinon.spy(),
        dragSpy = this.sinon.spy();
    // multiple targets cause justifiable event repetition, so limit to one
    this.col1.els = [this.target1]; 
    this.target1.addEventListener('grab-start', grabSpy);
    this.target1.addEventListener('stretch-start', stretchSpy);
    this.target1.addEventListener('drag-start', dragSpy);
    this.sh1.onGrabStartButton();
    this.sh1.onStretchStartButton();
    this.sh1.onDragDropStartButton();
    this.col1.tick();
    assert.equal(grabSpy.callCount, 1, 'grab once');
    assert.equal(stretchSpy.callCount, 1, 'stretch once');
    assert.equal(dragSpy.callCount, 1, 'drag once');
    this.col1.tick();
    assert.equal(grabSpy.callCount, 1, 'grab not repeated');
    assert.equal(stretchSpy.callCount, 1, 'stretch not repeated');
    assert.equal(dragSpy.callCount, 1, 'drag not repeated');
  });
});