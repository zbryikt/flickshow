view = new ldview do
  init-render: false
  root: document.body
  ctx: {}
  handler:
    wall: ({node, ctx}) ->
      node.style.backgroundImage = "url(#{ctx.img})"

window.jsonFlickrApi = (json) ->
  console.log json
  ctx = idx: 0
  view.setCtx ctx
  handler = ->
    photos = json.photos.photo
    photo = photos[ctx.idx]
    {server, id, secret} = photo
    ctx.img = "https://live.staticflickr.com/#server/#{id}_#{secret}.jpg"
    ctx.idx++
    view.render!
    if photos[ctx.idx] => setTimeout handler, 5000
  handler!

query =
  page: 1
  per_page: 100
  user_id: \129321464@N04
  method: "flickr.photos.search"
  api_key: "dcd316de73a13e64aab96966bdc48ab8"
  format: "json"

qs = [[k,v] for k,v of query].map(([k,v]) -> "#k=#v").join("&")
script = document.createElement \script
script.setAttribute(
  \src,
  "https://api.flickr.com/services/rest?#qs"
)
document.body.appendChild script

# lightbox url example
# https://flickr.com/photos/tkirby/52127164952/in/photostream/lightbox/


