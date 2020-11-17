function getNext() {
  start = start + limit;

  $.ajax({
    url: "/get-posts/" + start + "/" + limit,
    method: "GET",
    success: function (response) {
      // console.log(response);

      renderPosts(response, true);
    }
  });
}

function getPrevious() {
  start = start - limit;

  $.ajax({
    url: "/get-posts/" + start + "/" + limit,
    method: "GET",
    success: function (response) {
      // console.log(response);

      renderPosts(response, false);
    }
  });
}

function getPostHtml(post) {
  if (post.content.length > 200){
    post.content = post.content.substring(0, 200) + '...';
  }

  var html = "";
  html += '<div class="card mb-4" id="post-' + post._id + '">';
  html += '<div class="card-body">';
  html += '<div class="row">';
  html += '<div class="col-lg-6">';
  html += '<a href="#">';

  if (post.image == "") {
    html += '<img class="img-fluid rounded" src="http://placehold.it/750x300" alt="' + post.title + '">';
  } else {
    html += '<img class="img-fluid rounded" style="width: 100%; height: 300px; object-fit: cover;" src="' +  post.image + '" alt="' + post.title + '">';
  }
  
  html += '</a>';
  html += '</div>';

  html += '<div class="col-lg-6">';
  html += '<h2 class="card-title">';
  html += post.title;
  html += '</h2>';
  html += '<p class="card-text">';
  html += post.content;
  html += '</p>';
  html += '<a href="posts/' + post.title + '" class="btn btn-primary">Read More &rarr;</a>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

function renderPosts(posts, isNext) {
  if (posts.length > 0) {
    var html = "";

    for (var a = 0; a < posts.length; a++) {
      html += getPostHtml(posts[a]);
    }

    //$("#posts").html(html);
    document.getElementById("posts").innerHTML = html;
  } else {
    if (isNext) {
        start = start - limit;
    } else {
        start = start + limit;
    }
  }
}

function doComment(form) {
  var formData = {
    username: form.username.value,
    comment: form.comment.value,
    post_id: form.post_id.value,
    email: form.email.value
  };

  $.ajax({
    url: "/do-comment",
    method: "POST",
    data: formData,
    success: function (response) {
      formData._id = response._id;

      socket.emit("new_comment", formData);

      alert(response.text);
    }
  });
  return false;
}

function doReply(form) {
  var formData = {
    post_id: form.post_id.value,
    comment_id: form.comment_id.value,
    name: form.name.value,
    reply: form.reply.value,
    comment_email: form.comment_email.value
  };

  $.ajax({
    url: "/do-reply",
    method: "POST",
    data: formData,
    success: function (response) {
      formData._id = response._id;
      socket.emit("new_reply", formData);

      form.name.value = "";
      form.reply.value = "";

      alert(response.text);
    }
  });

  return false;
}

window.socket = null;

function init() {

    window.socket = io();

    if (localStorage.getItem("accessToken")) {
        var ajax = new XMLHttpRequest();
        ajax.open("POST", "/getUser", true);
        ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

        ajax.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {

                var response = JSON.parse(this.responseText);

                if (response.status == "success") {
                    window.user = response.data;
                    if (typeof doInitPostsScreen !== "undefined") {
                        initPostsScreen();
                    }
                } else {
                    localStorage.removeItem("accessToken");
                }
                showMainMenu();
            }
        };

        ajax.send("accessToken=" + localStorage.getItem("accessToken"));
    } else {
        showMainMenu();
    }

    socket.on("delete_post", function (replyId) {
      document.getElementById("post-" + replyId).remove();
    });

    socket.on("new_post", function (formData) {
      $("#posts").prepend(getPostHtml(formData));
    });

    socket.on("edit_post", function (formData) {
      $("#post-" + formData._id).replaceWith(getPostHtml(formData));
    });

    socket.on("edit_post", function (formData) {
      $("#post-title").html(formData.title);
      $("#post-image").attr("src", formData.image);
      $("#post-content").html(formData.content);
    });

    socket.on("new_comment", function (comment) {
      if (comment.post_id != $("#post_id").val()) {
        return;
      }

      var html = "";
      html += '<div class="media mb-4">';
      html += '<img class="d-flex mr-3 rounded-circle" src="http://placehold.it/50x50" alt="">';
      html += '<div class="media-body">';
      html += '<h5 class="mt-0">';
      html += comment.username;
      html += '</h5>';
      html += comment.comment;
      html += '</div>';
      html += '</div>';

      $("#comments").prepend(html);
    });

    socket.on("new_reply", function (reply) {
      var html = "";

      html += '<div class="media mb-4">';
      html += '<img class="d-flex mr-3 rounded-circle" src="http://placehold.it/50x50" alt="">';

      html += '<div class="media-body">';
      html += '<h5 class="mt-0">';
      html += reply.name;
      html += '</h5>';

      html += reply.reply;
      html += '</div>';
      html += '</div>';

      $("#replies-" + reply.comment_id).append(html);
    });
}

window.addEventListener("load", init);

function showMainMenu() {
    var html = "";

    if (localStorage.getItem("accessToken")) {
        html += `<li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="username" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              Hi, ` + window.user.name + `
            </a>
            <div class="dropdown-menu dropdown-menu-right" aria-labelledby="navbarDropdownBlog">
              <a class="dropdown-item" href="/addPost">Add Post</a>
              <a class="dropdown-item" href="/manage-posts">Manage Posts</a>
              <a class="dropdown-item" href="/logout" onclick="return doLogout();">Logout</a>
            </div>
        </li>`;
    } else {
        html += '<li class="nav-item">';
        html += '<a class="nav-link" href="/login">Login</a>';
        html += '</li>';

        html += '<li class="nav-item">';
        html += '<a class="nav-link" href="/signup">Signup</a>';
        html += '</li>';
    }

    document.getElementById("main-menu").innerHTML = html;
}

function doLogout() {
    localStorage.removeItem("accessToken");
    return true;
}