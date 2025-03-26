window.onload = generateTodos;
let skip=0;

function generateTodos() {
  axios
    .get(`/read-item?skip=${skip}`)
    .then((res) => {
      if (res.data.status !== 200) {
        alert(res.data.message);
        return;
      }

      console.log(res.data.data);
      console.log(skip);
      const todos = res.data.data;
      skip+=todos.length;
     console.log(skip);
      // dynamic displays of toods in list
      document.getElementById("Item_list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
         <span class="item-text">${item.todo}</span>
         <div>          
          <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1"> Edit</button>
          <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
          </div>
          </li>`;
          })
          .join("")
      );
    })
    .catch((err) => {
      console.log(err);
    });
}

document.addEventListener("click", function (event) {
  console.log(event.target.classList.contains("edit-me"));
  // edit
  if (event.target.classList.contains("edit-me")) {
    console.log(event.target.getAttribute("data-id"));
    const todoId = event.target.getAttribute("data-id");
    const newData = prompt("Enter new Todo Text");

    axios
      .post("/edit-item", { todoId, newData })
      .then((res) => {
        console.log(res);
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        event.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = newData;
      })
      .catch((error) => {
        console.log(error);
      });
  }
  //delete
  else if (event.target.classList.contains("delete-me")) {
    console.log(event.target.classList.contains("delete-me"));
    console.log(event.target.getAttribute("data-id"));
    const todoId = event.target.getAttribute("data-id");
    axios
      .post("/delete-item", { todoId })
      .then((res) => {
        console.log(res);
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        event.target.parentElement.parentElement.remove();
      })

      .catch((error) => {
        console.log(error);
      });
  }
  // add items
  else if (event.target.classList.contains("add_item")) {
    console.log(document.getElementById("create_field").value);
    const todo = document.getElementById("create_field").value;

    axios
      .post("/create-item", { todo })
      .then((res) => {
        console.log(res);
        if(res.data.status !== 201){
            alert(res.data.message);
            return;
        }
        document.getElementById("create_field").value= "";

        document.getElementById("Item_list").insertAdjacentHTML(
            "beforeend",
            `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
             <span class="item-text">${res.data.data.todo}</span>
             <div>          
              <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1"> Edit</button>
              <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
              </div>
              </li>`
        );
      })
      .catch((error) => console.log(error));
  }  
  //show-more
  else if (event.target.classList.contains("show_more")){
    generateTodos();
  }
});
