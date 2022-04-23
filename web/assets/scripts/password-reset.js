
$(document).ready(() => {
  $("#passwordReset").submit((e) => {
    e.preventDefault();
  });

  console.log("Document ready!");
})

function handlePasswordResetForm() {
  console.log("Submit.");
  const form = $("form").serializeArray();

  let password = form[0].value;
  let confirmPassword = form[1].value;

  if(password !== confirmPassword) {
    alert("Your passwords do no match.");
    return
  }

  const valid = validatePassword(password);
  if(!valid) {
    alert("Invalid password. Your password must be 8+ characters, including letters and numbers.");
    return;
  }

  $("input.appButton").attr("disabled", true);
  $("#loader").css('display', 'block');
  $("form input").prop("disabled", true);
  changePasswordTo(password);

  return false;
}


// Return boolean for valid password
function validatePassword(str) {
  // 8-64 alphanumerics and symbols
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,64}$/.test(str);
}


function changePasswordTo(password) {

  const url = buildResetURL();
  const data = getResetBodyData(password);

  console.log("Built url: " + url);
  console.log("Reset data: ", data);
  $.ajax({
    type: 'post',
    url: url,
    data: data,
    complete: complete,
    dataType: 'html/text'
  })
}

function buildResetURL() {
  const url = $(location).attr('href');
  const parts = url.split("/");
  console.log(parts);
  const userId = parts[parts.length-3];
  const token = parts[parts.length-1].split("?")[0];
  return `${parts[0]}/${parts[1]}/${parts[2]}/auth/v1/password-reset`;
}

function getResetBodyData(password) {
  const url = $(location).attr('href');
  const parts = url.split("/");
  const userId = parts[parts.length-2];
  const token = parts[parts.length-1].split("?")[0];

  return {
    userId,
    token,
    password
  }
}

function complete(xhr, textStatus) {
  console.log("xhr: ", xhr);
  console.log("Text status: ", textStatus);
  $("table").css('visibility', 'hidden');
  $('#loader').css('visibility', 'hidden');
  if(xhr.status == 200) {
    $('#success').css('display', 'block');
  } else {
    alert("There was an error resetting your password. Please try re-initiating the process.");
  }
}
