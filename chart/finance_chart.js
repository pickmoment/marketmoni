class FinanceChart {
  constructor(parent) {
    this.parent = parent;
    this.margin = { top: 10, right: 50, bottom: 20, left: 55 };
    this._date_format = '%d %H:%M'
    this._ema_options = []
    this._tick_count = 200;
    this._offset = 0;
    this.init();
  }

  data_callback(callback) {
    this._data_callback = callback
  }

  ema_options(options) {
    this._ema_options = options;
  }

  tick_count(count) {
    this._tick_count = count;
    this.tick_count_input.node().value = count;
  }

  period(period) {
    this._period = period
  }

  date_format(format) {
    this._date_format = format;
  }

  click_link(link) {
    this.symbol.on('click', function() {
      if (typeof link === "function") {
        link();
      } else {
        window.open(link);
      }
    });
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
      var mapper = this.ohlcMapper;
      const accessor = this.candlestick.accessor();
      if (!mapper) { mapper = {} }
      var parseDate = d3.timeParse(mapper.dateFormat||'%Y-%m-%d %H:%M:%S.%L');
      this._ohlc = data.map(function(d) {
        var dt;
        if (isNaN(d[mapper.date||'date'])) {
          dt = parseDate(d[mapper.date||'date'])
        } else {
          dt = new Date(d[mapper.date||'date'])
        }
        return {
            date: dt,
            open: +d[mapper.open||'open'],
            high: +d[mapper.high||'high'],
            low: +d[mapper.low||'low'],
            close: +d[mapper.close||'close'],
            volume: +d[mapper.volume||'volume']
        };
      }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });    
      this._ichimoku = this.ichimokuIndicator(this._ohlc);
      this._bollinger = this.bollingerIndicator(this._ohlc);

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
    this.bollinger = techan.plot.bollinger().xScale(this.x).yScale(this.y);
    this.bollingerIndicator = techan.indicator.bollinger().period(40);
    this.emas = []
    for (var i = 0; i < 3; i++) {
      this.emas.push(techan.plot.ema().xScale(this.x).yScale(this.y));
    }

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
    
    this.symbol = d3.select(this.parent).append('span').attr("class", "symbol");
    this.tick_count_input = d3.select(this.parent).append("input")
        .attr('size', 3).attr('value', this._tick_count).on('change', () => {
          this.tick_count(this.tick_count_input.node().value);
          this.draw();
        });
    // d3.select(this.parent).append("button").attr('class', 'plus').text('+').on('click', () => { 
    //   if (this._tick_count > 1) {
    //     this._tick_count--; 
    //   }
    //   this.draw(); 
    // });
    // d3.select(this.parent).append("button").attr('class', 'plus').text('+').on('click', () => { 
    //   if (this._tick_count > 2) {
    //     this._tick_count-=2; 
    //   } else if (this._tick_count > 1) {
    //     this._tick_count = 1;
    //   }
    //   this.draw(); 
    // });
    // d3.select(this.parent).append("button").attr('class', 'minus').text('-').on('click', () => { 
    //   if (this._tick_count < this._ohlc.length) {
    //     this._tick_count++; 
    //   }
    //   this.draw(); 
    // });
    // d3.select(this.parent).append("button").attr('class', 'minus').text('-').on('click', () => { 
    //   if (this._tick_count < this._ohlc.length - 2) {
    //     this._tick_count += 2; 
    //   } else if (this._tick_count < this._ohlc.length) {
    //     this._tick_count = this._ohlc.length;
    //   }
    //   this.draw(); 
    // });
    d3.select(this.parent).append("button").attr('class', 'full').text('O').on('click', () => { 
      this.tick_count(this._ohlc.length); 
      this._offset = 0;
      this.draw(); 
    });
    d3.select(this.parent).append("button").attr('class', 'left').text('<<').on('click', () => { 
      if (this._offset < this._ohlc.length-26 - 5) {
        this._offset += 5; 
      } else if (this._offset < this._ohlc.length-26) {
        this._offset = this._ohlc.length;
      }
      this.draw(); 
    });
    d3.select(this.parent).append("button").attr('class', 'left').text('<').on('click', () => { 
      if (this._offset < this._ohlc.length-26) {
        this._offset++; 
      }
      this.draw(); 
    });
    d3.select(this.parent).append("button").attr('class', 'right').text('>').on('click', () => { 
      if (this._offset > 0) {
        this._offset--; 
      }
      this.draw(); 
    });
    d3.select(this.parent).append("button").attr('class', 'right').text('>>').on('click', () => { 
      if (this._offset > 5) {
        this._offset -= 5; 
      } else if (this._offset > 0) {
        this._offset = 0;
      }
      this.draw(); 
    });


    var defs = this.svg.append("defs");

    defs.append("clipPath").attr("id", "clip")
        .append("rect").attr("x", 0).attr("y", 0)
          .attr("width", this.innerWidth).attr("height", this.innerHeight);    
          
    this.frame = this.svg.append('g').attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.plot = this.frame.append("g").attr("class", "plot").attr("transform", "translate(0,0)");
    this.plot.append("g").attr("class", "ichimoku").attr("clip-path", "url(#clip)");
    this.plot.append("g").attr("class", "bollinger").attr("clip-path", "url(#clip)");
    for (var i = 0; i < 3; i++) {
      this.plot.append("g").attr("class", "indicator ema ema"+i).attr("clip-path", "url(#clip)");
    }
    this.plot.append("g").attr("class", "candlestick").attr("clip-path", "url(#clip)");
    this.plot.append("g").attr("class", "volume").attr("clip-path", "url(#clip)");

    this.gX = this.frame.append("g").attr("class", "x axis")
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
  }

  draw() {
    var data = this._ohlc;
    if (!data) data = [];

    // this.x.domain(data.map(this.candlestick.accessor().d));
    this.x.domain(techan.scale.plot.time(data).domain());
    // this.y.domain(techan.scale.plot.ohlc(data, this.candlestick.accessor()).domain());
    this.y.domain(techan.scale.plot.bollinger(this._bollinger, this.bollinger.accessor()).domain());
    this.yVolume.domain(techan.scale.plot.volume(data).domain());

    var start = data.length - this._tick_count - this._offset;
    var end = data.length - this._offset + 26;
    if (start < 0) start = 0;
    if (end > data.length + 26) end = data.length + 26
    this.x.zoomable().clamp(false).domain([data.length-this._tick_count-this._offset, data.length-this._offset+26]);
    // this.gX.call(this.xAxis);
  
    this.plot.selectAll("g.volume").datum(data).call(this.volume);
    this.plot.selectAll("g.ichimoku").datum(this._ichimoku).call(this.ichimoku);
    this.plot.selectAll("g.bollinger").datum(this._bollinger).call(this.bollinger);
    for (var i = 0; i < this._ema_options.length; i++) {
      this.plot.selectAll("g.ema.ema"+i).datum(techan.indicator.ema().period(this._ema_options[i])(data)).call(this.emas[i]);
    }
    // this.plot.selectAll("g.ema.ema1").datum(techan.indicator.ema().period(10)(data)).call(this.ema1);
    // this.plot.selectAll("g.ema.ema2").datum(techan.indicator.ema().period(30)(data)).call(this.ema2);
    // this.plot.selectAll("g.ema.ema3").datum(techan.indicator.ema().period(90)(data)).call(this.ema3);
    this.plot.selectAll("g.candlestick").datum(data).call(this.candlestick);
  
    this.frame.selectAll("g.x.axis").call(this.xAxis);
    this.frame.selectAll("g.y.axis").call(this.yAxis);
    this.frame.selectAll("g.volume.axis").call(this.volumeAxis);

    this.frame.selectAll("g.crosshair.ohlc").call(this.crosshair); 

    var symbol_text = this._symbol;
    if (this._ema_options) {
      symbol_text += ` (ema:${this._ema_options})`;
    }
    this.symbol.text(symbol_text);
    this.candleText(data[data.length-1])
    this.timeAnnotation.format(d3.timeFormat(this._date_format));

    if (this._data_callback) {
      this._data_callback({
        'symbol': this._symbol,
        'ohlc': this._ohlc,
        'ichimoku': this._ichimoku,
        'bollinger': this._bollinger
      })
    }

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