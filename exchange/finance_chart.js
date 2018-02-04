class FinanceChart {
  constructor(parent) {
    this.parent = parent;
    this.margin = { top: 10, right: 20, bottom: 20, left: 55 };
    this._date_format = '%d %H:%M'
    this.init();
  }

  period(period) {
    this._period = period
  }

  date_format(format) {
    this._date_format = format;
  }

  click_link(link) {
    this.parent.onclick = function() {
      window.open(link);
    }
  }

  symbol_text(symbol_text) {
    this._symbol = symbol_text;
  }

  get width() {
    return this.parent.clientWidth;
  }

  get height() {
    return this.width / 3.2;
  }

  get innerWidth() {
    return this.width - (this.margin.left + this.margin.right);
  }

  get innerHeight() {
    return this.height - (this.margin.top + this.margin.bottom);
  }

  isDict(v) {
      return !!v && typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date) && isJsonable(v);
  }

  ohlc(data) {
    try {
      const mapper = this.ohlcMapper;
      const accessor = this.candlestick.accessor();
      if (!mapper) { mapper = {} }
      var parseDate = d3.timeParse(mapper.dateFormat||'%Y-%m-%d %H:%M:%S.%L');
      this._ohlc = data.map(function(d) {
        return {
            date: parseDate(d[mapper.date||'date']),
            open: +d[mapper.open||'open'],
            high: +d[mapper.high||'high'],
            low: +d[mapper.low||'low'],
            close: +d[mapper.close||'close'],
            volume: +d[mapper.volume||'volume']
        };
      }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });    
      this._ichimoku = this.ichimokuIndicator(this._ohlc);

      this.candleMap = this._ohlc.reduce(function(map, obj) {
        map[obj.date] = obj;
        return map;
      }, {});      

    } catch(e) {
      console.log(e);     
    } 
  }

  mapper(mapper) {
    this.ohlcMapper = mapper;
  }

  init() {
    this.x = techan.scale.financetime().range([0, this.innerWidth]);
    this.y = d3.scaleLinear().range([this.innerHeight, 0]);    
    this.yVolume = d3.scaleLinear().range([this.y(0), this.y(0.2)]);

    this.xAxis = d3.axisBottom(this.x);
    this.yAxis = d3.axisLeft(this.y);
    this.volumeAxis = d3.axisRight(this.yVolume).ticks(3).tickFormat(d3.format(",.3s"));

    this.candlestick = techan.plot.candlestick().xScale(this.x).yScale(this.y);
    this.volume = techan.plot.volume().accessor(this.candlestick.accessor()).xScale(this.x).yScale(this.yVolume);
    this.ichimoku = techan.plot.ichimoku().xScale(this.x).yScale(this.y);
    this.ichimokuIndicator = techan.indicator.ichimoku();

    this.timeAnnotation = techan.plot.axisannotation().axis(this.xAxis).orient('bottom')
        .format(d3.timeFormat(this._date_format)).width(50)
        .translate([0, this.innerHeight]);
    this.ohlcAnnotation = techan.plot.axisannotation().axis(this.yAxis).orient('left');        
    this.volumeAnnotation = techan.plot.axisannotation().axis(this.volumeAxis).orient('right')
        .width(35);


    this.crosshair = techan.plot.crosshair().xScale(this.x).yScale(this.y)
        .xAnnotation(this.timeAnnotation)
        .yAnnotation([this.ohlcAnnotation, this.volumeAnnotation])
        .on("move", this.move.bind(this));        

    this.svg = d3.select(this.parent).append("svg")
            .attr("width", this.width).attr("height", this.height);  

    var defs = this.svg.append("defs");

    defs.append("clipPath").attr("id", "clip")
        .append("rect").attr("x", 0).attr("y", 0)
          .attr("width", this.innerWidth).attr("height", this.innerHeight);    
          
    this.frame = this.svg.append('g').attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.plot = this.frame.append("g").attr("class", "plot").attr("transform", "translate(0,0)");
    this.plot.append("g").attr("class", "volume").attr("clip-path", "url(#clip)");
    this.plot.append("g").attr("class", "ichimoku").attr("clip-path", "url(#clip)");
    this.plot.append("g").attr("class", "candlestick").attr("clip-path", "url(#clip)");

    this.frame.append("g").attr("class", "x axis")
            .attr("transform", "translate(0," + this.innerHeight + ")");
    this.frame.append("g").attr("class", "y axis")
            .append("text").attr("transform", "rotate(-90)")
              .attr("y", 6).attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("가격 (원)");
    this.frame.append("g").attr("class", "volume axis");
    this.frame.append('g').attr("class", "crosshair ohlc");

    this.coordsText = this.frame.append('text').style("text-anchor", "end")
            .attr("class", "coords").attr("x", this.innerWidth - this.margin.left + this.margin.right);    
    this.symbol = this.frame.append('text').attr("class", "symbol").style("text-anchor", "end")
            .attr("x", this.innerWidth - this.margin.left + this.margin.right).attr("y", 12);
  }

  draw() {
    var data = this._ohlc;
    if (!data) data = [];
    // this.x.domain(data.map(this.candlestick.accessor().d));
    this.x.domain(techan.scale.plot.time(data).domain());
    this.y.domain(techan.scale.plot.ohlc(data, this.candlestick.accessor()).domain());
    this.yVolume.domain(techan.scale.plot.volume(data).domain());
  
    this.plot.selectAll("g.volume").datum(data).call(this.volume);
    this.plot.selectAll("g.ichimoku").datum(this._ichimoku).call(this.ichimoku);
    this.plot.selectAll("g.candlestick").datum(data).call(this.candlestick);
  
    this.frame.selectAll("g.x.axis").call(this.xAxis);
    this.frame.selectAll("g.y.axis").call(this.yAxis);
    this.frame.selectAll("g.volume.axis").call(this.volumeAxis);

    this.frame.selectAll("g.crosshair.ohlc").call(this.crosshair); 

    this.symbol.text(this._symbol);
    this.candleText(data[data.length-1])
    this.timeAnnotation.format(d3.timeFormat(this._date_format));
  }

  move(coords) {
    const candle = this.candleMap[coords.x];
    this.candleText(candle);
  }  

  candleText(candle) {
    const formatDate = d3.timeFormat(this._date_format)
    this.coordsText.text(`[${formatDate(candle.date)}] O:${candle.open}, H:${candle.high}, L:${candle.low}, C:${candle.close}, V:${candle.volume}`);
  }

}