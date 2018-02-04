Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm')
  }
})

Vue.filter('currency', function(value) {
  if (value) {
    parts = value.toString().split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.');
  }
  return 'N/A'
})


var app = new Vue({
  el: '#app',
  data: {
  },
  created: function() {
    console.log('yobit')
    // this.$http.get('https://yobit.net/api/3/info').then((res) => {
    //   console.log(Object.keys(res.body.pairs))
    // })

    this.$http.get('https://yobit.net/api/3/trades/ltc_usd').then((res) => {
      console.log(res.body)
    })
  },
  methods: {
  }
})

