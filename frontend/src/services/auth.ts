import request from "@/utils/request";

export async function login(data: any) {
  const params = new URLSearchParams();
  params.append('username', data.username);
  params.append('password', data.password);
  
  return request.post("/login/access-token", params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
}

export async function register(data: any) {
  return request.post("/login/register", data);
}
