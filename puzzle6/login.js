async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  document.getElementById("result").innerText = "Checking credentials...";

  try {
    const response = await fetch(
      "https://YOUR-BACKEND.onrender.com/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      document.getElementById("result").innerText = data.error;
    } else {
      document.getElementById("result").innerText = data.message;
    }

  } catch (err) {
    document.getElementById("result").innerText =
      "Network error contacting auth service.";
  }
}
