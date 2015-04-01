"use strict";

;(function(ng)
{

    ng.module('splitbox', [])
    /**
     * @ngdoc directive
     * @name splitbox.directive:splitBox
     * @element div
     * @function
     *
     * @description
     * 生成IDE布局
     *
     * **Note:** 兼容ie9+
     *
     * @example
       <example module="demo">
         <file name="index.html">
             <div ng-controller="demoCtrl" split-box="config" style="height: 400px; overflow: hidden;"></div>
         </file>
         <file name="script.js">
            angular.module('demo', ['splitbox'])

            .controller('demoCtrl',
            ['$scope',
                function($scope){
                    $scope.config = {
                        direction: 'y',
                        barWidth: 10,
                        minSize: 10,
                        animateClass: 'animate',
                        boxs: [
                            {id: 1, minSize: 20, isHide: false},
                            {id: 3, parentId: 1},
                            {id: 2, parentId: 1, size: 70},
                            {id: 4},
                            {id: 5, parentId: 2}
                        ]
                    };
                }
            ]);
         </file>
         <file name="style.css">
            .split-box{
                background: #43AC6A;
                color: #fff;
                border: 1px solid;
                padding: 2px;
            }

            .animate div{
                transition: .3s all;
            }
         </file>
       </example>
     */

    .directive('splitBox',
    ['$compile', 'splitBox::utils', 
        function($compile,   utils){

            return {
                restrict: 'A',
                link: function(scope, element, attrs){
                    var config = {
                        exportName: 'splitBox',
                        boxs: [],
                        boxTemplate: '<div class="split-box"></div>',
                        barTemplate: '<div class="split-bar"></div>',
                        direction: 'x',
                        barWidth: 10,
                        minSize: 5,
                        isFlat: true,
                        animateClass: ''
                    };

                    angular.extend(config, scope[attrs.splitBox]);

                    //成为子元素的定位祖先
                    if(!element[0].style.position || element[0].style.position === 'static'){
                        element.css({position: 'relative'});
                    }

                    var root = utils.transformToNextedBoxs(config.boxs, config.direction);
                    var items = utils.getItems(root);

                    //根据显示的box数量，生成对应的html
                    root.$boxs = utils.boxHTML(items.boxs, config);
                    root.$bars = utils.barHTML(items.bars.length, config);
                    root.config = config;
                    root.rootElement = element;


                    $compile(root.$boxs)(scope);
                    $compile(root.$bars)(scope);

                    utils.render(root);

                    utils.relateBoxs(items.boxs, root);
                    utils.relateBars(items.bars, root);

                    element.append(root.$boxs);
                    element.append(root.$bars);

                    root.addDom = function(dom, isBox){
                        $compile(dom)(scope);
                        element[isBox ? 'prepend' : 'append'](dom);
                    };

                    if(attrs.splitBoxExports) scope[attrs.splitBoxExports] = root;

                    console.log(root);
                }
            };
        }
    ])

    // .directive('splitItem',
    // [
    //     function(){
    //         var props = ['width', 'height'];

    //         return {
    //             restrict: 'A',
    //             link: function(scope, element, attrs){
    //                 element.on('transitionend', function(e){
    //                     if(props.indexOf(e.propertyName) > -1){
    //                         if(element[0].style[e.propertyName] === '0%'){
    //                             element[0].style.display = 'none';
    //                         }
    //                     }
    //                 });
    //             }
    //         };
    //     }
    // ])

    .directive('splitBar',
    ['$rootScope', '$window',
        function($rootScope,   $window){
            var resizeOverlayTpl = '<div></div>';
            var eventsMap = {
                web: {
                    down: 'mousedown',
                    up: 'mouseup',
                    move: 'mousemove'
                },
                mobile: {
                    down: 'touchstart',
                    up: 'touchend',
                    move: 'touchmove'
                }
            };
            var device;

            if($window.document.hasOwnProperty("ontouchstart")){
                device = 'mobile';
            }else{
                device = 'web';
            }

            return {
                restrict: 'A',
                compile: function(element, attrs){
                    return function(scope, element, attrs){
                        var $resizeOverlay = angular.element(resizeOverlayTpl);

                        $resizeOverlay.css({
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            left: 0,
                            bottom: 0,
                            zIndex: 1
                        });

                        element.on(eventsMap[device].down, function(e){
                            e.preventDefault();
                            var bar = element.data('resizeBar');
                            var $parent = element.parent();
                            var pRect = $parent[0].getBoundingClientRect();
                            var rect = element[0].getBoundingClientRect();
                            var point = {
                                x: (e.touches ? e.touches[0].clientX : e.clientX) - pRect.left,
                                y: (e.touches ? e.touches[0].clientY : e.clientY) - pRect.top
                            };
                            var relative = point;

                            $resizeOverlay.css({display: 'block'});

                            $parent.on(eventsMap[device].move, function(e){
                                point = {
                                    x: (e.touches ? e.touches[0].clientX : e.clientX) - pRect.left,
                                    y: (e.touches ? e.touches[0].clientY : e.clientY) - pRect.top
                                };
                                var offset;

                                if(bar.direction === 'x'){
                                    offset = (point.x - relative.x) * 100/pRect.width;
                                }else{
                                    offset = (point.y - relative.y) * 100/pRect.height;
                                }

                                if(bar.resize(offset) !== false){
                                    relative = point;
                                }
                            });

                            $parent.on(eventsMap[device].up, function(e){
                                $resizeOverlay.css({display: 'none'});
                                $parent.off(eventsMap[device].move);
                                $parent.off(eventsMap[device].up);
                            });
                        });
                    };
                }
            };
        }
    ])

    .factory('splitBox::utils',
    ['$templateCache',
        function($templateCache){
            var utils = null;

            function Box(box){
                angular.extend(this, box);
                this._isHide = false;
            }

            Box.prototype = {
                constructor: Box,
                render: function(showSize/*box的尺寸，可能是宽，也可能是高*/){
                    if(this.isRoot) return;

                    var style = {
                        position: 'absolute',
                        width: 'auto',
                        left: 'auto',
                        height: 'auto',
                        top: 'auto'
                    };
                    var scale = 1;

                    //render时，根据父级direction设置自身的direction
                    this.direction = this.parent.direction === 'x' ? 'y' : 'x';

                    //设置box的offset
                    var prev = this.prev;
                    while(prev && prev.isHide){
                        prev = prev.prev;
                    }
                    if(!prev){
                        this.offset = 0;
                    }else{
                        this.offset = prev.offset + prev.size;
                    }

                    scale = this.returnScale();
                    this.showSize = this.isHide ? 0 : this.size * scale;
                    this.showOffset = ((this.parent.parent && this.parent.parent.showOffset) || 0) + this.offset * scale;

                    // if(this.showSize){
                    //     style.display = 'block';
                    // }

                    if(!this.childCount){
                        if(this.direction === 'x'){
                            style.left = this.showOffset + '%';
                            style.top = this.parent.showOffset + '%';
                            style.height = this.parent.showSize + '%';
                            style.width = this.showSize + '%';
                        }else{
                            style.left = this.parent.showOffset + '%';
                            style.width = this.parent.showSize + '%';
                            style.top = this.showOffset + '%';
                            style.height = this.showSize + '%';
                        }
                        angular.extend(this.root.$boxs[this.domIndex].style, style);
                    }
                },
                //计算box下所有子box的size和与显示的子box的size和的比
                calcTotalShowScale: function(){
                    var current = this.firstChild;
                    var totalShowChildSize = 0;

                    while(current){
                        if(!current.isInit){
                            current.isInit = true;
                            current._isHide = !!current.isHide;
                            current.size = (current.size || 100 / current.parent.childCount);
                        }
                        current.isHide || (totalShowChildSize += current.size);
                        current = current.next;
                    }

                    this.scale = 100 / totalShowChildSize;
                },
                //返回指定key方向上和this最近的显示的box
                closestShowBox: function(key){
                    var closest = this;

                    while(closest && closest.isHide){
                        closest = closest[key];
                    }

                    return closest;
                },
                returnScale: function(){
                    var scale = (this.parent.parent && this.parent.parent.showSize) / 100;

                    isNaN(scale) && (scale = 1);
                    scale *= this.parent.scale;

                    return scale;
                },
                hide: function(hide){
                    if(this.isRoot) return;

                    this.isHide = !!hide;
                    //如果isHide发生变化，设置对应的resizeBar的isHide
                    if(!this.isHide !== !this._isHide){
                        this._isHide = this.isHide;
                        var bar = this.nextBar;
                        while(bar && bar.isHide === this.isHide){
                            bar = (bar.next && bar.next.nextBar);
                        }
                        if(!bar){
                            bar = this.prevBar;
                            while(bar && bar.isHide === this.isHide){
                                bar = (bar.prev && bar.prev.prevBar);
                            }
                        }
                        if(bar){
                            bar.isHide = this.isHide;
                            bar.render();
                        }
                        //执行显示隐藏时，给父级添加class来显示动画效果
                        this.root.config.animateClass && 
                            this.root.rootElement.addClass(this.root.config.animateClass);
                        this.parent.calcTotalShowScale();

                        if(!isFinite(this.parent.scale)){
                            this.parent.hide(true);
                        }else{
                            this.parent.hide(false);
                            utils.render(this.parent);
                        }
                    }
                },
                remove: function(){
                    if(this.childCount > 1){
                        //如果不是叶子节点，遍历子box，挨个删除
                        var temp = this.firstChild;

                        //标记当前box已经销毁
                        this.isDestroy = true;

                        while(temp){
                            temp.remove();
                            temp = temp.next;
                        }
                    }else{
                        //如果是叶子节点，删除对应的DOM
                        angular.element(this.root.$boxs[this.domIndex]).remove();
                        this.root.$boxs[this.domIndex] = void 0;
                        if(this.parent.isDestroy) return;
                    }

                    this.parent.childCount--;
                    this.isHide || this.parent.showChildCount--;

                    if(!this.prev){
                        //删除的是第一个节点
                        this.parent.firstChild = this.next;
                        this.next.prevBar =
                        this.next.prev = void 0;
                        utils.removeResizeBar(this.nextBar);
                    }else if(!this.next){
                        //删除的是最后一个节点
                        this.parent.lastChild = this.prev;
                        this.prev.nextBar =
                        this.prev.next = void 0;
                        utils.removeResizeBar(this.prevBar);
                    }else{
                        this.prev.next = this.next;
                        this.prevBar.next = this.next;
                        this.next.prev = this.prev;
                        this.next.prevBar = this.prevBar;
                        utils.removeResizeBar(this.nextBar);
                    }

                    if(!this.parent.isDestroy){
                        this.parent.calcTotalShowScale();
                        this.parent.isRoot || utils.fixStructure(this.parent);
                        utils.render(this.parent);
                    }
                },
                append: function(box){
                    var pBox = this;

                    if(!(this.childCount > 1)){
                        //如果是叶子节点
                        pBox = utils.addParentBox(this);
                    }
                    utils.addBox(pBox, box, pBox.childCount || 2); 
                },
                prepend: function(box){
                    var pBox = this;

                    if(!(this.childCount > 1)){
                        //如果是叶子节点
                        pBox = utils.addParentBox(this);
                    }
                    utils.addBox(pBox, box, 0); 
                },
                before: function(box){
                    if(this.isRoot) return;

                    var index = 0;
                    var prev = this;

                    while(prev = prev.prev){
                        index++;
                    }

                    utils.addBox(this.parent, box, index);
                },
                after: function(box){
                    if(this.isRoot) return;

                    var index = 1;
                    var prev = this;

                    while(prev = prev.prev){
                        index++;
                    }

                    utils.addBox(this.parent, box, index);
                }
            };

            function ResizeBar(){}

            ResizeBar.prototype = {
                constructor: ResizeBar,
                render: function(){
                    var style = {
                        position: 'absolute',
                        width: 'auto',
                        left: 'auto',
                        height: 'auto',
                        top: 'auto'
                    };
                    var box = this.prev;
                    var barWidth = this.root.config.barWidth;
                    var scale = box.returnScale();

                    this.direction = box.direction;

                    if(this.isHide){
                        this.root.$bars[this.domIndex].style.display = 'none';
                        return;
                    }else{
                        style.display = 'block';
                    }

                    if(this.direction === 'x'){
                        style.left = box.showOffset + box.showSize + '%';
                        style.width = barWidth + 'px';
                        style.top = box.parent.showOffset + '%';
                        style.height = box.parent.showSize + '%';
                        style.marginLeft = -barWidth / 2 + 'px';
                        style.cursor = 'col-resize';
                    }else{
                        style.top = box.showOffset + box.showSize + '%';
                        style.height = barWidth + 'px';
                        style.left = box.parent.showOffset + '%';
                        style.width = box.parent.showSize + '%';
                        style.marginTop = -barWidth / 2 + 'px';
                        style.cursor = 'row-resize';
                    }
                    angular.extend(this.root.$bars[this.domIndex].style, style);
                },
                resize: function(_offset){
                    if(!_offset) return true;
                    //执行resize时，删除父级class来显示动画效果
                    this.root.config.animateClass && 
                        this.root.rootElement.removeClass(this.root.config.animateClass);

                    var offset = _offset / this.prev.returnScale();
                    var temp = this;
                    var minSize = this.root.config.minSize;
                    var prev = temp.prev.closestShowBox('prev');
                    var next = temp.next.closestShowBox('next');

                    if(prev.size + offset > (prev.minSize || minSize) &&
                        next.size - offset > (next.minSize || minSize) ){
                        //size的调整使相关的box都大于minSize
                        prev.size += offset;
                        next.size -= offset;
                        utils.render(prev);
                        utils.render(next);
                        temp.render();
                        return true;
                    }

                    var reduceKey = 'prev'; //调整导致box的size减小的方向
                    var increaseKey = 'next'; //调整导致box的size增大的方向
                    var siblingsBars = []; //box的size减小方向上所有的resizeBar的list
                    var siblingsTotalSize = 0; //box的size减小方向上所有box的size和
                    var siblingsTotalMinSize = 0; //box的size减小方向上所有box的minSize和
                    var isExceed = false; //偏移是否大于偏移方向上所有box的可偏移量

                    if(offset > 0){
                        reduceKey = 'next';
                        increaseKey = 'prev';
                    }
                    offset = Math.abs(offset);

                    //找出box的size减小的方向上所有显示的兄弟box
                    while(temp){
                        if(!temp[reduceKey].isHide){
                            siblingsBars.push(temp);
                            siblingsTotalSize += temp[reduceKey].size;
                            siblingsTotalMinSize += temp[reduceKey].minSize || minSize;
                        }
                        temp = temp[reduceKey][reduceKey === 'prev' ? 'prevBar' : 'nextBar'];
                    }

                    //偏移大于偏移方向上所有box的可偏移量时，设置offset为最大可偏移量
                    if(siblingsTotalSize - offset < siblingsTotalMinSize){
                        offset = siblingsTotalSize - siblingsTotalMinSize;
                        isExceed = true;
                    }

                    temp = siblingsBars[0][increaseKey].closestShowBox(increaseKey);
                    temp.size = temp.size + offset;
                    //因为渲染box的时候，会渲染其nextBar，所以不需要再单独渲染resizeBar
                    utils.render(temp);

                    while((temp = siblingsBars.shift()) && offset){
                        var ms = (temp[reduceKey].minSize || minSize);
                        if((temp[reduceKey].size -= offset) < ms){
                            offset = ms - temp[reduceKey].size;
                            temp[reduceKey].size = ms;
                        }else{
                            offset = 0;
                        }
                        //因为渲染box的时候，会渲染其nextBar，所以不需要再单独渲染resizeBar
                        utils.render(temp[reduceKey]);
                    }

                    //返回false时，让resizeBar的mousemove不记录之后的point信息
                    return !isExceed;
                }
            };

            return utils = {
                render: function(root){
                    var current = null;
                    var next = root;

                    while(current = next){

                        current.render();
                        if(current.nextBar){
                            current.nextBar.render();
                        }
                        //深度优先
                        next = current.firstChild || current.next;

                        //当前box没有子box或下一个兄弟box时，找到其父级的下一个兄弟box
                        while(!next && current && next !== root){
                            next = (current = current.parent) && current.next;
                        }
                    }
                },
                //根据扁平的配置数据生成嵌套的box
                transformToNextedBoxs: function(data, direction){
                    var map = [];
                    var root = new this.Box({});
                    var temp = null;

                    root.isRoot = true;
                    root.root = root;
                    root.direction = direction;
                    root.offset = root.showOffset = 0;
                    root.size = root.showSize = 100;

                    for(var i = 0, len = data.length; i < len; i++){
                        map[data[i].id] = new this.Box(data[i]);
                    }

                    for(i = 0; i < len; i++){
                        if(map[data[i].parentId] && data[i].id != data[i].parentId){
                            temp = map[data[i].parentId];;
                        }else{
                            temp = root;
                        }

                        //设置box之间的关系
                        if(!temp.firstChild){
                            temp.firstChild = map[data[i].id];
                            temp.childCount = 1;
                            temp.showChildCount = temp.firstChild.isHide ? 0 : 1;
                        }else{
                            temp.lastChild.next = map[data[i].id];
                            temp.lastChild.next.prev = temp.lastChild;
                            temp.lastChild.next.isHide || temp.showChildCount++;
                            temp.childCount++;
                        }

                        temp.lastChild = map[data[i].id];
                        temp.lastChild.parent = temp;

                        map[data[i].id].root = root;
                    }

                    //保证每个父节点必须要有至少两个子节点
                    for(var n in map){
                        utils.fixStructure(map[n]);
                    }

                    return root;
                },
                replaceProps: function(source, target, callback){
                    var props = ['parent', 'next', 'prev', 'prevBar', 'nextBar', 'offset', 'size'];

                    angular.forEach(props, function(prop, i, props){
                        target[prop] = source[prop];
                        callback && callback(prop, i, props);
                    });
                },
                //获取需要显示的box（叶子节点）和resizeBar
                getItems: function(root){
                    var boxs = [];
                    var bars = [];
                    var current = root;
                    var next = root.firstChild;

                    current.calcTotalShowScale();

                    while(current = next){

                        if(!current.childCount){
                            //设定与box对象对应的dom的索引
                            current.domIndex = boxs.length;
                            boxs.push(current);
                        }else{
                            current.calcTotalShowScale();
                        }

                        //如果当前box后仍有box，在他们之间关联一个resizeBar
                        if(current.next){
                            current.nextBar = new ResizeBar();
                            current.nextBar.prev = current;
                            current.nextBar.next = current.next;
                            current.nextBar.root = root;
                            current.nextBar.domIndex = bars.length;
                            current.nextBar.next.prevBar = current.nextBar;
                            bars.push(current.nextBar);
                        }

                        //深度优先
                        next = current.firstChild || current.next;

                        //当前box没有子box或下一个兄弟box时，找到其父级的下一个兄弟box
                        while(!next && current && next !== root){
                            next = (current = current.parent) && current.next;
                        }
                    }

                    return {
                        boxs: boxs,
                        bars: bars
                    };
                },
                //修复当前的结构（一个父节点至少要有两个子节点，root除外）
                fixStructure: function(box){
                    if(box.isRoot) return;

                    if(angular.isDefined(box.childCount) && box.childCount === 1){
                        utils.replaceProps(box, box.firstChild);
                        !box.prev && (box.parent.firstChild = box.firstChild);
                        !box.next && (box.parent.lastChild = box.firstChild);
                        if(box.prev){
                            box.prev.next = box.firstChild;
                            box.prev.nextBar && (box.prev.nextBar.next = box.firstChild);
                        }
                        if(box.next){
                            box.next.prev = box.firstChild;
                            box.next.prevBar && (box.next.prevBar.prev = box.firstChild);
                        }

                        return true;
                    }
                },
                removeResizeBar: function(resizeBar){
                    angular.element(resizeBar.root.$bars[resizeBar.domIndex]).remove();
                    resizeBar.root.$bars[resizeBar.domIndex] = void 0;
                },
                addParentBox: function(box){
                    var pBox = new Box({});

                    utils.replaceProps(box, pBox, function(prop){ prop !== 'size' && (box[prop] = void 0);});
                    pBox.firstChild = box;
                    pBox.lastChild = box;
                    pBox.root = box.root;
                    pBox.showChildCount = box.isHide ? 0 : 1;
                    pBox.childCount = 1;
                    box.parent = pBox;
                    !pBox.prev && (pBox.parent.firstChild = pBox);
                    !pBox.next && (pBox.parent.lastChild = pBox);
                    if(pBox.prev){
                        pBox.prev.next = pBox;
                        pBox.prev.nextBar && (pBox.prev.nextBar.next = pBox);
                    }
                    if(pBox.next){
                        pBox.next.prev = pBox;
                        pBox.next.prevBar && (pBox.next.prevBar.prev = pBox);
                    }

                    return pBox;
                },
                addBox: function(pBox, box, index){
                    if(!pBox) return false;
                    if(!(box instanceof Box)){
                        box = new Box(box);
                    }

                    var root = pBox.root;
                    var bar = new ResizeBar();

                    if(index <= 0){
                        box.next = pBox.firstChild;
                        box.next.prev = box;
                        pBox.firstChild = box;
                        box.nextBar = bar;
                        box.nextBar.root = root;
                        box.nextBar.prev = box;
                        box.nextBar.next = box.next;
                        box.nextBar.next.prevBar = box.nextBar;
                    }else if(index < pBox.childCount){
                        var prev = pBox.firstChild;
                        var next = null;

                        while(--index){
                            prev = prev.next;
                        }

                        next = prev.next;
                        box.prev = prev;
                        box.next = next;
                        prev.next = box;
                        next.prev = box;
                        box.prevBar = prev.nextBar;
                        prev.nextBar.next = box;
                        box.nextBar = bar;
                        box.nextBar.root = root;
                        box.nextBar.prev = box;
                        box.nextBar.next = box.next;
                        box.nextBar.next.prevBar = box.nextBar;
                    }else{
                        box.prev = pBox.lastChild;
                        box.prev.next = box;
                        pBox.lastChild = box;
                        box.prevBar = bar;
                        box.prevBar.root = root;
                        box.prevBar.next = box;
                        box.prevBar.prev = box.prev;
                        box.prevBar.prev.nextBar = box.prevBar;
                    }

                    bar.domIndex = root.$bars.length;
                    box.domIndex = root.$boxs.length;
                    box.parent = pBox;
                    box.root = pBox.root;
                    box.isHide || pBox.showChildCount++;
                    pBox.childCount++;
                    pBox.calcTotalShowScale();

                    root.$boxs.push(this.boxHTML([box], root.config)[0]);
                    root.$bars.push(this.barHTML(1, root.config)[0]);

                    utils.relateBoxs([box], root);
                    utils.relateBars([bar], root);

                    root.addDom(root.$boxs[root.$boxs.length - 1], true);
                    root.addDom(root.$bars[root.$bars.length - 1]);

                    this.render(pBox);
                },
                relateBoxs: function(boxs, root){
                    //将box对象和对应dom关联
                    angular.forEach(boxs, function(n, i){
                        angular.element(root.$boxs[n.domIndex]).data('splitBox', n);
                    });
                },
                relateBars: function(bars, root){
                    //将resizeBar对象和对应dom关联
                    angular.forEach(bars, function(n, i){
                        // n.render();
                        angular.element(root.$bars[n.domIndex]).data('resizeBar', n);
                    });
                },
                boxHTML: function(boxs, config){
                    return angular.element(boxs.map(function(n){
                        return $templateCache.get(n.template) || n.template || config.boxTemplate;
                    }).join('')).attr('split-item', true);
                },
                barHTML: function(barLength, config){
                    return angular.element(new Array(barLength + 1).join(config.barTemplate)).attr('split-bar', true);
                },
                Box: Box,
                ResizeBar: ResizeBar
            };
        }
    ])
}(angular))
