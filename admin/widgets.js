// Custom Decap widgets. Plain script, no build step.
(function () {
  // 0–100 slider with live value. Stores a number.
  var PercentSlider = createClass({
    handleChange: function (e) {
      var v = parseInt(e.target.value, 10);
      if (isNaN(v)) v = 50;
      this.props.onChange(Math.max(0, Math.min(100, v)));
    },
    render: function () {
      var raw = this.props.value;
      var value = typeof raw === 'number' && !isNaN(raw) ? raw : 50;
      return h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
        h('input', {
          type: 'range', min: '0', max: '100', step: '1',
          value: value, onChange: this.handleChange,
          'aria-label': 'Värde i procent',
          style: { flex: '1' }
        }),
        h('span', { style: { minWidth: '44px', textAlign: 'right' } }, value + ' %')
      );
    }
  });

  CMS.registerWidget('percent_slider', PercentSlider);
})();
