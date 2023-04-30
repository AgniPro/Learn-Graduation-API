/*! Simple AJAX infinite scroll */ ! function (t, e) {
    t.InfiniteScroll = function (n) {
        function r(t, n) {
            return n = n || e, n.querySelectorAll(t)
        }

        function o(t) {
            return void 0 !== t
        }

        function a(t) {
            return "function" == typeof t
        }

        function i(t, e) {
            t = t || {};
            for (var n in e) t[n] = "object" == typeof e[n] ? i(t[n], e[n]) : e[n];
            return t
        }

        function s(t, e, n) {
            return o(t) ? o(e) ? void(o(n) ? g[t][n] = e : g[t].push(e)) : g[t] : g
        }

        function d(t, e) {
            o(e) ? delete g[t][e] : g[t] = []
        }

        function l(t, e) {
            if (o(g[t]))
                for (var n in g[t]) g[t][n](e)
        }

        function c() {
            return L.innerHTML = p.text.loading, v = !0, M ? (y.classList.add(p.state.loading), l(
                "loading", [p]), void u(M, function (t, n) {
                y.className = x + " " + p.state.load, h = e.createElement("div"), h
                    .innerHTML = t;
                var o = r("title", h),
                    a = r(p.target.post, h),
                    i = r(p.target.anchors + " " + p.target.anchor, h),
                    s = r(p.target.post, H);
                if (o = o && o[0] ? o[0].innerHTML : "", a.length && s.length) {
                    var d = s[s.length - 1];
                    e.title = o, d.insertAdjacentHTML("afterend", " "), h = e.createElement(
                        "div");
                    for (var c = 0, u = a.length; u > c; ++c) h.appendChild(a[c]);
                    d.insertAdjacentHTML("afterend", h.innerHTML), f(), M = i.length ? i[0]
                        .href : !1, v = !1, q++, l("load", [p, t, n])
                }
            }, function (t, e) {
                y.classList.add(p.state.error), v = !1, f(1), l("error", [p, t, e])
            })) : (y.classList.add(p.state.loaded), L.innerHTML = p.text.loaded, l("loaded", [p]))
        }

        function f(t) {
            if (L.innerHTML = "", T) {
                h.innerHTML = p.text[t ? "error" : "load"];
                var e = h.firstChild;
                e.onclick = function () {
                    return 2 === p.type && (T = !1), c(), !1
                }, L.appendChild(e)
            }
        }
        var u = "infinite-scroll-state-",
            p = {
                target: {
                    posts: ".posts",
                    post: ".post",
                    anchors: ".anchors",
                    anchor: ".anchor"
                },
                text: {
                    load: "%s",
                    loading: "%s",
                    loaded: "%s",
                    error: "%s"
                },
                state: {
                    load: u + "load",
                    loading: u + "loading",
                    loaded: u + "loaded",
                    error: u + "error"
                }
            },
            g = {
                load: [],
                loading: [],
                loaded: [],
                error: []
            };
        p = i(p, n || {}), p.on = s, p.off = d;
        var h = null,
            u = function (e, n, r) {
                if (t.XMLHttpRequest) {
                    var o = new XMLHttpRequest;
                    o.onreadystatechange = function () {
                        if (4 === o.readyState) {
                            if (200 !== o.status) return void(r && a(r) && r(o.responseText, o));
                            n && a(n) && n(o.responseText, o)
                        }
                    }, o.open("GET", e), o.send()
                }
            },
            T = 1 !== p.type,
            v = !1,
            H = r(p.target.posts)[0],
            L = r(p.target.anchors)[0],
            M = r(p.target.anchor, L),
            m = e.body,
            y = e.documentElement,
            x = y.className || "",
            E = H.offsetTop + H.offsetHeight,
            j = t.innerHeight,
            A = 0,
            b = null,
            q = 1;
        if (M.length) {
            M = M[0].href, H.insertAdjacentHTML("afterbegin", " "), h = e.createElement("div"), f();
            var w = function () {
                E = H.offsetTop + H.offsetHeight, j = t.innerHeight, A = m.scrollTop || y.scrollTop,
                    v || E > A + j || c()
            };
            w(), 0 !== p.type && t.addEventListener("scroll", function () {
                T || (b && t.clearTimeout(b), b = t.setTimeout(w, 200))
            }, !1)
        }
        return p
    }
}(window, document);
if (typeof InfiniteScroll !== "undefined") {
    var infinite_scroll = new InfiniteScroll({
        type: 0,
        target: {
            posts: ".blogPts",
            post: ".ntry",
            anchors: ".blogPg",
            anchor: ".olLnk"
        },
        text: {
            load: "<a aria-label='Load more posts' class='jsLd' data-text='Load more posts' href='javascript:;'></a>",
            loading: "<div class='jsLd wait nPst' data-text='Loading&hellip;'><svg viewBox='0 0 50 50' x='0px' y='0px'><path d='M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z'><animateTransform attributeName='transform' attributeType='xml' dur='0.6s' from='0 25 25' repeatCount='indefinite' to='360 25 25' type='rotate'></animateTransform></path></svg></div>",
            loaded: "<div class='jsLd nPst' data-text='No results found'></div>",
            error: "<a aria-label='Load more posts' class='jsLd error' data-text='More&hellip;' href='javascript:;'></a>"
        }
    });
}

/*<![CDATA[*/
function darkMode() {
    localStorage.setItem("mode", "darkmode" === localStorage.getItem("mode") ? "light" : "darkmode"),
        "darkmode" === localStorage.getItem("mode") ? document.querySelector("#mainCont").classList.add(
            "drK") : document.querySelector("#mainCont").classList.remove("drK")
};

function headScroll() {
    const distanceY = window.pageYOffset || document.documentElement.scrollTop,
        shrinkOn = 40,
        commentEl = document.getElementById('header');
    if (distanceY > shrinkOn) {
        commentEl.classList.add("stick");
    } else {
        commentEl.classList.remove("stick");
    }
}
window.addEventListener('scroll', headScroll);
/* lazy youtube */
(function () {
    var youtube = document.querySelectorAll(".lazyYt");
    for (var i = 0; i < youtube.length; i++) {
        var source = "https://img.youtube.com/vi/" + youtube[i].dataset.embed + "/sddefault.jpg";
        var image = new Image();
        image.setAttribute("class", "lazy");
        image.setAttribute("data-src", source);
        image.setAttribute("src", "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
        image.setAttribute("alt", "Youtube video");
        image.addEventListener("load", function () {
            youtube[i].appendChild(image);
        }(i));
        youtube[i].addEventListener("click", function () {
            var iframe = document.createElement("iframe");
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allowfullscreen", "");
            iframe.setAttribute("src", "https://www.youtube.com/embed/" + this.dataset.embed +
                "?rel=0&showinfo=0&autoplay=1");
            this.innerHTML = "";
            this.appendChild(iframe);
        });
    };
})();
/* Lightbox image script*/
for (var imageslazy = document.querySelectorAll(
        '.pS .separator img, .pS .tr-caption-container img, .pS .psImg >img, .pS .btImg >img'), i = 0; i <
    imageslazy.length; i++) imageslazy[i].setAttribute('onclick', 'return false');

function wrap(o, t, e) {
    for (var i = document.querySelectorAll(t), c = 0; c < i.length; c++) {
        var a = o + i[c].outerHTML + e;
        i[c].outerHTML = a
    }
}
wrap('<div class="zmImg">', '.pS .separator >a', '</div>');
wrap('<div class="zmImg">', '.pS .tr-caption-container td >a', '</div>');
wrap('<div class="zmImg">', '.pS .separator >img', '</div>');
wrap('<div class="zmImg">', '.pS .tr-caption-container td >img', '</div>');
wrap('<div class="zmImg">', '.pS .psImg >img', '</div>');
wrap('<div class="zmImg">', '.pS .btImg >img', '</div>');
for (var containerimg = document.getElementsByClassName('zmImg'), i = 0; i < containerimg.length; i++)
    containerimg[i].onclick = function () {
        this.classList.toggle('s');
    };
Defer.dom('.lazy', 100, 'loaded', null, {
    rootMargin: '1px'
}), 'undefined' != typeof infinite_scroll && infinite_scroll.on('load', function () {
    Defer.dom('.lazy', 100, 'loaded', null, {
        rootMargin: '1px'
    })
});


! function (c, i, t) {
    var f, o = /^data-(.+)/,
        u = 'IntersectionObserver',
        r = /p/.test(i.readyState),
        s = [],
        a = s.slice,
        d = 'lazied',
        n = 'load',
        e = 'pageshow',
        l = 'forEach',
        m = 'hasAttribute',
        h = 'shift';

    function p(e) {
        i.head.appendChild(e)
    }

    function v(e, n) {
        a.call(e.attributes)[l](n)
    }

    function y(e, n, t, o) {
        return o = (o = n ? i.getElementById(n) : o) || i.createElement(e), n && (o.id = n), t && (o.onload =
            t), o
    }

    function b(e, n) {
        return a.call((n || i).querySelectorAll(e))
    }

    function g(t, e) {
        b('source', t)[l](g), v(t, function (e, n) {
            (n = o.exec(e.name)) && (t[n[1]] = e.value)
        }), e && (t.className += ' ' + e), n in t && t[n]()
    }

    function I(e) {
        f(function (o) {
            o = b(e || '[type=deferjs]'),
                function e(n, t) {
                    (n = o[h]()) && (n.parentNode.removeChild(n), (t = y(n.nodeName)).text = n.text, v(
                        n,
                        function (e) {
                            'type' != e.name && (t[e.name] = e.value)
                        }), t.src && !t[m]('async') ? (t.onload = t.onerror = e, p(t)) : (p(t),
                        e()))
                }()
        })
    }(f = function (e, n) {
        r ? t(e, n) : s.push(e, n)
    }).all = I, f.js = function (n, t, e, o) {
        f(function (e) {
            (e = y('SCRIPT', t, o)).src = n, p(e)
        }, e)
    }, f.css = function (n, t, e, o) {
        f(function (e) {
            (e = y('LINK', t, o)).rel = 'stylesheet', e.href = n, p(e)
        }, e)
    }, f.dom = function (e, n, t, o, i) {
        function r(e) {
            o && !1 === o(e) || g(e, t)
        }
        f(function (t) {
            t = u in c && new c[u](function (e) {
                e[l](function (e, n) {
                    e.isIntersecting && (n = e.target) && (t.unobserve(n), r(n))
                })
            }, i), b(e || '[data-src]')[l](function (e) {
                e[m](d) || (e.setAttribute(d, ''), t ? t.observe(e) : r(e))
            })
        }, n)
    }, f.reveal = g, c.Defer = f, c.addEventListener('on' + e in c ? e : n, function () {
        for (I(); s[0]; t(s[h](), s[h]())) r = 1
    })
}(this, document, setTimeout),
function (e, n) {
    e.defer = n = e.Defer, e.deferscript = n.js, e.deferstyle = n.css, e.deferimg = e.deferiframe = n.dom
}(this);