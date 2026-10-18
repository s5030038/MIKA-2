// discussion-board.js
// A sample discussion board for the event page (bookingsPage.html, "Discussion Board" tab).
//   - starts with a few sample posts so the board never looks empty
//   - people can post, reply, like and delete their own posts
//   - posts are saved in localStorage, one board per event
// It looks for <section id="board" data-event="..."> and fills in the rest.

(function () {
  var MAX_LENGTH = 500;
  var MAX_REPLY_LENGTH = 300;

  var board = document.getElementById("board");
  if (!board) return;

  // one board per event: <section id="board" data-event="tiny-desk-concert"> or ?event=... in the URL
  var eventKey = board.dataset.event ||
    new URLSearchParams(window.location.search).get("event") ||
    "event";
  var STORAGE_KEY = "mika_board_" + eventKey;

  var AVATAR_COLOURS = ["#E3B4BF", "#F2C9B8", "#D9A0AC", "#EBCFC4", "#C98A9A", "#F0D5CC"];

  var state = { posts: [], sort: "newest" };

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // the logged-in user's name (from Settings / Edit Profile), or "You"
  function currentUserName() {
    try {
      var s = JSON.parse(localStorage.getItem("mika_settings") || "null");
      if (s && s.fullName && s.fullName.trim()) return s.fullName.trim();
    } catch (e) { /* ignore */ }
    return "You";
  }

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    var letters = parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "");
    return letters.toUpperCase();
  }

  function colourFor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
    return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
  }

  function timeAgo(ms) {
    var seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (seconds < 60) return "just now";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + (minutes === 1 ? " min ago" : " mins ago");
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    var days = Math.floor(hours / 24);
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function avatar(name) {
    var node = el("div", "board-avatar", initials(name));
    node.style.background = colourFor(name);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  /* ---------- storage + sample data ---------- */

  function samplePosts() {
    var now = Date.now();
    var H = 3600 * 1000;
    return [
      {
        id: "s1", author: "Maya L.", tag: "Going together", time: now - 3 * H, likes: 6, liked: false, mine: false,
        text: "First time at a Tiny Desk style show and I'm going solo. Anyone else? Happy to meet near the entrance before doors open!",
        replies: [
          { id: "s1r1", author: "Dan K.", time: now - 2 * H, mine: false, text: "I'm solo too! I'll be there from about 12:00. See you at the entrance." },
          { id: "s1r2", author: "Priya S.", time: now - 1 * H, mine: false, text: "Count me in, this sounds like a lovely idea." }
        ]
      },
      {
        id: "s2", author: "Jordan P.", tag: "Question", time: now - 26 * H, likes: 3, liked: false, mine: false,
        text: "Is there easy parking nearby, or is it better to catch public transport?",
        replies: [
          { id: "s2r1", author: "Sam R.", time: now - 24 * H, mine: false, text: "The event page lists free parking, but I'd get there early. It fills up quickly." }
        ]
      },
      {
        id: "s3", author: "Chloe T.", tag: "Tips", time: now - 50 * H, likes: 9, liked: false, mine: false,
        text: "Doors open at 12:15 and you need valid ID with your ticket. Bring a jumper too, it gets chilly near the water.",
        replies: []
      }
    ];
  }

  function loadPosts() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved)) return saved;
    } catch (e) { /* fall through to samples */ }
    var seeded = samplePosts();
    savePosts(seeded);
    return seeded;
  }

  function savePosts(posts) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch (e) { /* storage full or blocked */ }
  }

  /* ---------- sorting ---------- */

  function sortedPosts() {
    var copy = state.posts.slice();
    if (state.sort === "liked") {
      return copy.sort(function (a, b) { return b.likes - a.likes || b.time - a.time; });
    }
    if (state.sort === "replies") {
      return copy.sort(function (a, b) { return b.replies.length - a.replies.length || b.time - a.time; });
    }
    return copy.sort(function (a, b) { return b.time - a.time; });   // newest first
  }

  /* ---------- rendering ---------- */

  function buildReply(post, reply) {
    var item = el("div", "board-reply");
    item.appendChild(avatar(reply.author));

    var body = el("div", "board-reply__body");
    var head = el("div", "board-post__head");
    head.appendChild(el("strong", "board-author", reply.author));
    if (reply.mine) head.appendChild(el("span", "board-you", "You"));
    head.appendChild(el("span", "board-time", timeAgo(reply.time)));
    body.appendChild(head);
    body.appendChild(el("p", "board-post__text", reply.text));

    if (reply.mine) {
      var del = el("button", "board-link", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("Delete this reply?")) return;
        post.replies = post.replies.filter(function (r) { return r.id !== reply.id; });
        commit();
      });
      body.appendChild(del);
    }

    item.appendChild(body);
    return item;
  }

  function buildPost(post) {
    var article = el("article", "board-post");
    article.id = "post-" + post.id;
    article.appendChild(avatar(post.author));

    var body = el("div", "board-post__body");

    var head = el("div", "board-post__head");
    head.appendChild(el("strong", "board-author", post.author));
    if (post.mine) head.appendChild(el("span", "board-you", "You"));
    head.appendChild(el("span", "board-time", timeAgo(post.time)));
    if (post.tag) head.appendChild(el("span", "board-tag", post.tag));
    body.appendChild(head);

    body.appendChild(el("p", "board-post__text", post.text));

    // actions: like / reply / delete
    var actions = el("div", "board-post__actions");

    var like = el("button", "board-action" + (post.liked ? " is-active" : ""));
    like.type = "button";
    like.setAttribute("aria-pressed", post.liked ? "true" : "false");
    like.setAttribute("aria-label", (post.liked ? "Unlike" : "Like") + " this post");
    like.textContent = (post.liked ? "\u2665 " : "\u2661 ") + post.likes;
    like.addEventListener("click", function () {
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
      commit();
    });
    actions.appendChild(like);

    var replyBtn = el("button", "board-action", "Reply" + (post.replies.length ? " (" + post.replies.length + ")" : ""));
    replyBtn.type = "button";
    replyBtn.setAttribute("aria-expanded", "false");
    actions.appendChild(replyBtn);

    if (post.mine) {
      var del = el("button", "board-link", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("Delete this post and its replies?")) return;
        state.posts = state.posts.filter(function (p) { return p.id !== post.id; });
        commit();
      });
      actions.appendChild(del);
    }
    body.appendChild(actions);

    // replies
    if (post.replies.length) {
      var replies = el("div", "board-replies");
      post.replies.forEach(function (r) { replies.appendChild(buildReply(post, r)); });
      body.appendChild(replies);
    }

    // reply form (hidden until "Reply" is clicked)
    var form = el("form", "board-reply-form");
    form.hidden = true;
    form.noValidate = true;
    var input = el("input", "board-reply-input");
    input.type = "text";
    input.maxLength = MAX_REPLY_LENGTH;
    input.placeholder = "Write a reply...";
    input.setAttribute("aria-label", "Reply to " + post.author);
    var send = el("button", "board-btn board-btn--small", "Send");
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);
    body.appendChild(form);

    replyBtn.addEventListener("click", function () {
      form.hidden = !form.hidden;
      replyBtn.setAttribute("aria-expanded", form.hidden ? "false" : "true");
      if (!form.hidden) input.focus();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      post.replies.push({ id: newId(), author: currentUserName(), time: Date.now(), mine: true, text: text });
      commit();
    });

    article.appendChild(body);
    return article;
  }

  function render() {
    var list = $("board-list");
    var empty = $("board-empty");
    var count = $("board-count");
    if (!list) return;

    list.innerHTML = "";
    sortedPosts().forEach(function (post) { list.appendChild(buildPost(post)); });

    var replyTotal = state.posts.reduce(function (sum, p) { return sum + p.replies.length; }, 0);
    if (count) {
      count.textContent = state.posts.length + (state.posts.length === 1 ? " post" : " posts") +
        " \u00B7 " + replyTotal + (replyTotal === 1 ? " reply" : " replies");
    }
    if (empty) empty.hidden = state.posts.length > 0;

    document.querySelectorAll(".board-sort button").forEach(function (btn) {
      var active = btn.dataset.sort === state.sort;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  // save, then redraw
  function commit() {
    savePosts(state.posts);
    render();
  }

  /* ---------- composer ---------- */

  function setUpComposer() {
    var form = $("board-composer");
    var text = $("board-text");
    var counter = $("board-counter");
    var error = $("board-error");
    var composerAvatar = $("composer-avatar");
    if (!form || !text) return;

    // avatar shows the user's own initials
    if (composerAvatar) {
      var name = currentUserName();
      composerAvatar.textContent = initials(name);
      composerAvatar.style.background = colourFor(name);
    }

    function updateCounter() {
      if (counter) counter.textContent = text.value.length + " / " + MAX_LENGTH;
    }
    text.maxLength = MAX_LENGTH;
    text.addEventListener("input", function () {
      updateCounter();
      if (error) error.textContent = "";
    });
    updateCounter();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var message = text.value.trim();
      if (!message) {
        if (error) error.textContent = "Write something before posting.";
        text.focus();
        return;
      }

      var tagInput = form.querySelector('input[name="board-tag"]:checked');
      state.posts.push({
        id: newId(),
        author: currentUserName(),
        tag: tagInput ? tagInput.value : "General",
        time: Date.now(),
        likes: 0,
        liked: false,
        mine: true,
        text: message,
        replies: []
      });

      text.value = "";
      updateCounter();
      state.sort = "newest";     // so the new post is visible at the top
      commit();
    });
  }

  /* ---------- start-up ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    state.posts = loadPosts();

    document.querySelectorAll(".board-sort button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.sort = btn.dataset.sort;
        render();
      });
    });

    setUpComposer();
    render();
  });
})();