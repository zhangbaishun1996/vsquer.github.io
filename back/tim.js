var canvas = document.getElementById("timeline");
var ctx = canvas.getContext("2d");
var canvansW = $('.bottomd ').outerWidth()-200;
var canVansH = $('#timeline').parent().height(); 
var minutes_per_step = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 720, 1440]; // min/格
var graduation_step = 20;//刻度间最小宽度，单位px
var hours_per_ruler = 24;//时间轴显示24小时
var start_timestamp = new Date(getDateYear()).getTime()-(hours_per_ruler*3600*1000)/2;
var distance_between_gtitle = 80;
var zoom = 24;
var g_isMousedown = false;//拖动mousedown标记
var g_isMousemove = false;//拖动mousemove标记
var g_mousedownCursor = null;//拖动mousedown的位置
var returnTime = null;//mouseup返回时间
window.timer = null; //定义定时器
window.stat = 0; //定义累加秒数
/*模拟数据*/
var timecell = [
   /* {
        "beginTime":new Date().getTime()-3*3600*1000,
        "endTime":new Date().getTime()-1*3600*1000,
        "style": {
            "background":"rgba(132, 244, 180, 0.498039)"
        }
    }, */
];
/*模拟数据 end*/

/* 动态设置canvas宽高 */
$(window).resize(function() {
var canvansW = $('.bottomd ').outerWidth()-200;
	clearCanvas();
	initCanvasContainer(canvansW,canVansH);
	init(start_timestamp,timecell);
});
initCanvasContainer(canvansW,canVansH);
function initCanvasContainer(canvansW,canVansH){
	document.getElementById("timeline").width = canvansW;
	document.getElementById("timeline").height = canVansH;
}

init(start_timestamp,timecell);

/**
 * 初始化
 * @param {*} start_timestamp 最左侧时间
 * @param {*} timecell 录像段数组
 */
function init(start_timestamp,timecell){
    drawCellBg();
    add_graduations(start_timestamp);
    add_cells(timecell);
    drawLine(0,canVansH,canvansW,canVansH,"rgb(151, 158, 167)",1); //底线
    drawLine(canvansW/2,0,canvansW/2,33,"rgb(64, 196, 255",2); //中间播放点时间线
    add_events();
    var time = start_timestamp + (hours_per_ruler*3600*1000)/2;
    ctx.fillStyle = "rgb(64, 196, 255)";
    ctx.fillText(changeTime(time),canvansW/2-60,50);
	$('#setTimeID').val(changeTime(time));
}

/**
 * 绘制添加刻度
*/
function add_graduations(start_timestamp){
    var px_per_min = canvansW / (hours_per_ruler * 60); // px/min
    var px_per_ms = canvansW / (hours_per_ruler * 60 * 60 * 1000); // px/ms
    var px_per_step = graduation_step;  // px/格 默认最小值20px
    var min_per_step = px_per_step / px_per_min; // min/格
    for(var i = 0; i < minutes_per_step.length;i++){ 
        if(min_per_step <= minutes_per_step[i]){ //让每格时间在minutes_per_step规定的范围内
            min_per_step = minutes_per_step[i]; 
            px_per_step = px_per_min * min_per_step;
            break;
        }
    }

    var medium_step = 30;
    for (var i = 0; i < minutes_per_step.length; i++) {
        if (distance_between_gtitle / px_per_min <= minutes_per_step[i]) {
            medium_step = minutes_per_step[i];
            break;
        }
    }

    var num_steps = canvansW / px_per_step; //总格数
    var graduation_left;
    var graduation_time;
    var caret_class;
    var lineH;
    var ms_offset = ms_to_next_step(start_timestamp,min_per_step*60*1000);//开始的偏移时间 ms
    var px_offset = ms_offset * px_per_ms; //开始的偏移距离 px
    var ms_per_step = px_per_step / px_per_ms; // ms/step
    for(var i = 0; i < num_steps; i++){
        graduation_left = px_offset + i * px_per_step; // 距离=开始的偏移距离+格数*px/格
        graduation_time = start_timestamp + ms_offset + i * ms_per_step; //时间=左侧开始时间+偏移时间+格数*ms/格
        var date = new Date(graduation_time);
        if (date.getUTCHours() == 0 && date.getUTCMinutes() == 0) {
            caret_class = 'big';
            lineH = 25;
            var big_date = graduation_title(date);
            ctx.fillText(big_date,graduation_left-20,30);
            ctx.fillStyle = "rgba(151,158,167,1)";
        }else if (graduation_time / (60 * 1000) % medium_step == 0) {
            caret_class = 'middle';
            lineH = 15;
            var middle_date = graduation_title(date);
            ctx.fillText(middle_date,graduation_left-20,30);
            ctx.fillStyle = "rgba(151,158,167,1)";
        }else{
            lineH = 10;
        }
        // drawLine(graduation_left,0,graduation_left,lineH,"rgba(151,158,167,0.4)",1);
        drawLine(graduation_left,0,graduation_left,lineH,"rgba(151,158,167,1)",1);
    }
}

/**
 * 绘制线
 * @param {*} beginX 
 * @param {*} beginY 
 * @param {*} endX 
 * @param {*} endY 
 * @param {*} color 
 * @param {*} width 
 */
function drawLine(beginX,beginY,endX,endY,color,width){
    ctx.beginPath();
    ctx.moveTo(beginX,beginY);
    ctx.lineTo(endX,endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

/**
 * 添加录像段
 * @param {*} cells 录像数组
 */
function add_cells(cells){
    cells.forEach(cell => {
        draw_cell(cell);
    });
}  

/**
 * 绘制录像块
 * @param {*} cell cell包括beginTime ms;endTime ms;style 
 */
function draw_cell(cell){
    var px_per_ms = canvansW / (hours_per_ruler * 60 * 60 * 1000); // px/ms
    var beginX = (cell.beginTime - start_timestamp) * px_per_ms;
    var cell_width = (cell.beginTime - cell.endTime) * px_per_ms;
    ctx.fillStyle = cell.style.background;
    ctx.fillRect(beginX,0,cell_width,15);
}

/**
 * 绘制录像块背景
 */
function drawCellBg(){
    ctx.fillStyle = "rgba(69, 72, 76, 0.5)";
    ctx.fillRect(0,0,canvansW,15); 
}

/**
 * 时间轴事件
 */
function add_events(){
    canvas.addEventListener('mousewheel',mousewheelFunc,{passive:true});
    canvas.addEventListener('mousedown',mousedownFunc,{passive:true});
    canvas.addEventListener('mousemove',mousemoveFunc,{passive:true});
    canvas.addEventListener('mouseup',mouseupFunc,{passive:true});
    canvas.addEventListener('mouseout',mouseoutFunc,{passive:true});
}

/**
 * 拖动/点击 mousedown事件
 */
function mousedownFunc(e){
	var left = $('.boxcanvasd').offset().left;
    g_isMousedown = true;
    g_mousedownCursor = get_cursor_x_position(e)-left;//记住mousedown的位置
	initIntetval(false);
}

/**
 * 拖动/鼠标hover显示 mousemove事件
 */
function mousemoveFunc(e){
	var left = $('.boxcanvasd').offset().left;
    var pos_x = get_cursor_x_position(e);
		pos_x = pos_x-left;
    var px_per_ms = canvansW / (hours_per_ruler * 60 * 60 * 1000); // px/ms
    clearCanvas();
    if(g_isMousedown){
        var diff_x = pos_x - g_mousedownCursor;
        start_timestamp = start_timestamp - Math.round(diff_x / px_per_ms);
        init(start_timestamp,timecell);
        g_isMousemove = true;
        g_mousedownCursor = pos_x;
    }else{
        var time = start_timestamp + pos_x/px_per_ms;
        init(start_timestamp,timecell);
        drawLine(pos_x,0,pos_x,50,"rgb(194, 202, 215)",1);
        ctx.fillStyle = "rgb(194, 202, 215)";
        ctx.fillText(changeTime(time),pos_x-50,60);
    }
}

/**
 * 拖动/点击 mouseup事件
 */
function mouseupFunc(e){
	var left = $('.boxcanvasd').offset().left;
    if(g_isMousemove){ //拖动 事件
        g_isMousemove = false;
        g_isMousedown = false;
        returnTime = start_timestamp + (hours_per_ruler*3600*1000)/2;
		window.stat = 0;
		initIntetval(true,returnTime);
    }else{ // click 事件
        g_isMousedown = false;
        var posx = get_cursor_x_position(e); //鼠标距离 px
        	posx = posx-left;
        var ms_per_px = (zoom * 3600 * 1000) / canvansW; // ms/px
        returnTime = start_timestamp + posx * ms_per_px;
        set_time_to_middle(returnTime);
		initIntetval(true,returnTime);
    }
}

/**
 * 鼠标移出隐藏时间 mouseout事件
 * @param {*} e 
 */
function mouseoutFunc(e){
	if(g_isMousemove){
       g_isMousemove = false;
       g_isMousedown = false;
       $(canvas).off('mousemove');
	}
    clearCanvas();
    init(start_timestamp,timecell);
}

/**
 * 滚轮放大缩小，以时间轴中心为准 mousewheel事件
 */
function mousewheelFunc(event){
	 var event = window.event || event;
    if(event && event.preventDefault){
        event.preventDefault();
    }else{
        window.event.returnValue = false;
        return false;
    }	

	initMouseWheelfucn(event);
}
function initMouseWheelfucn(e,statues){
	var delta = 0;
	if(statues === undefined){
		delta = Math.max(-1,Math.min(1,(e.wheelDelta || -e.detail)));
	}else{
		delta = statues;
	}
	
	var middle_time = start_timestamp + (hours_per_ruler*3600*1000)/2; //ms 记住当前中间的时间
	if (delta < 0) {
	    zoom = zoom + 4;
		if (zoom >= 24) {
			zoom = 24;//放大最大24小时
	    }
	    hours_per_ruler = zoom;
	} else if (delta > 0) {// 放大
	    zoom = zoom - 4;
		if (zoom <= 1) {
			zoom = 1;//缩小最小1小时
	    }
	    hours_per_ruler = zoom;
	}	
	
	clearCanvas();
	start_timestamp = middle_time - (hours_per_ruler*3600*1000)/2; //start_timestamp = 当前中间的时间 - zoom/2
	init(start_timestamp,timecell);
}

/**
 * 获取鼠标posx
 * @param {*} e 
 */
function get_cursor_x_position (e) {
    var posx = 0;

    if (! e) {
        e = window.event;
    }
    
    if (e.pageX || e.pageY) {
        posx = e.pageX;
    }else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    }
    
    return posx;
}

/**
 * 返回时间轴上刻度的时间
 * @param {*} datetime new Date 格式
 */
function graduation_title(datetime) {
    if (datetime.getHours() == 0 && datetime.getMinutes() == 0 && datetime.getMilliseconds() == 0) {
        return ('0' + datetime.getDate().toString()).substr(-2) + '.' +
            ('0' + (datetime.getMonth() + 1).toString()).substr(-2) + '.' +
            datetime.getFullYear();
    }
    return datetime.getHours() + ':' + ('0' + datetime.getMinutes().toString()).substr(-2);
};

/**
 * 返回 2018-01-01 10:00:00 格式时间
 * @param {*} time 
 */
function changeTime (time) {
    var newTime = new Date(time);
    var year = newTime.getFullYear();
    var month = newTime.getMonth() + 1;
    if(month < 10){
        var month = "0" + month;
    }
    var date = newTime.getDate();
   if (date < 10) {
        var date = "0" + date;
    } 
    var hour = newTime.getHours();
    if (hour < 10) {
        var hour = "0" + hour;
    }
    var minute = newTime.getMinutes();
    if (minute < 10) {
        var minute = "0" + minute;
    }
    var second = newTime.getSeconds();
    if (second < 10) {
        var second = "0" + second;
    }
    return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
}

/**
 * 左侧开始时间的偏移，返回单位ms
 * @param {*} timestamp 
 * @param {*} step 
 */
function ms_to_next_step(timestamp, step) {
    var remainder = timestamp % step;
    return remainder ? step - remainder : 0;
}

/**
 * 设置时间，让这个时间点跳到中间红线处
 *  @param {*} time 单位ms
 */
function set_time_to_middle(time){
    clearCanvas();
    start_timestamp = time - (hours_per_ruler * 60 * 60 * 1000)/2;
    init(start_timestamp,timecell);
}

function returnMouseupTime(){
    if(returnTime != null){
        return returnTime;
    }
}

/**
 * 清除canvas 每次重新绘制需要先清除
 */
function clearCanvas(){
    ctx.clearRect(0,0,canvansW,150);
}
$("#timeline").mouseup(function(){
	var a = returnMouseupTime();
})
//获取当天零点
function getDateYear(){
	var date = new Date();
	var year = date .getFullYear();
	var mon = date .getMonth()+1;
	var day = date .getDate();
	mon<10?'0'+mon:mon;
	day<10?'0'+day:day;
	return year+'-'+mon+'-'+day+' '+'00:00:00'
}
/* 释放内存 */
g_mousedownCursor = null;
returnTime = null;
window.timer = null;
