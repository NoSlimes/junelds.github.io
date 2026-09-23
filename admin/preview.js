// Card previews for the Decap editor. Plain script, no build step:
// Decap exposes `createClass` and `h` (React.createElement) globally.
(function () {
  function firstImage(entry) {
    var imgs = entry.getIn(['data', 'images']);
    if (imgs && imgs.size) {
      var first = imgs.first();
      if (typeof first !== 'string') {
        first = first && first.get ? (first.get('bild') || first.get('image') || first.get('src')) : null;
      }
      if (first) return first;
    }
    return entry.getIn(['data', 'image']);
  }

  // Committed images are stored as "media/x.jpg" (no leading slash).
  // Prefix so they resolve from the site root in the preview iframe.
  // Uploaded-but-unsaved images come back as blob:/data: URLs, keep those.
  function pubSrc(props, value) {
    if (!value) return '';
    var asset = props.getAsset(value);
    var src = asset && asset.toString ? asset.toString() : String(asset || '');
    if (/^(blob:|data:|https?:|\/)/.test(src)) return src;
    return '/' + src;
  }

  function cardPreview(className) {
    return createClass({
      render: function () {
        var entry = this.props.entry;
        var img = firstImage(entry);
        return h('div', { className: className },
          img ? h('img', { className: 'tour-image', src: pubSrc(this.props, img) }) : null,
          h('h3', {}, entry.getIn(['data', 'title']) || ''),
          h('p', {}, entry.getIn(['data', 'summary']) || '')
        );
      }
    });
  }

  var NewsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      return h('div', { className: 'news-card' },
        h('h3', {}, entry.getIn(['data', 'title']) || ''),
        h('div', { className: 'news-text' }, this.props.widgetFor('text'))
      );
    }
  });

  CMS.registerPreviewStyle('/styles.css');
  // Match the on-site card width (grid columns), otherwise images stretch.
  CMS.registerPreviewStyle('.tour-card,.news-card{max-width:380px;margin:0 auto;}', { raw: true });
  CMS.registerPreviewTemplate('turer', cardPreview('tour-card'));
  CMS.registerPreviewTemplate('tjanster', cardPreview('tour-card service-card'));
  CMS.registerPreviewTemplate('aktuellt', NewsPreview);
})();
