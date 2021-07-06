import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';

export let options = {
  stages: [
    { duration: '3m', target: 100 }, // 3분 동안 사용자 1명에서 100 명으로 증가하는 트래픽을 시뮬레이션합니다.
    { duration: '2m', target: 100 }, // 2분 동안 사용자 100 명 유지
    { duration: '10s', target: 0 } // 사용자 0 명으로 감소
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(99)<3125'], // 99% of requests must complete below 3.125s
    'logged in successfully': ['p(99)<3125'], // 99% of requests must complete below 3.125s
  }
};

const BASE_URL = 'http://3.34.50.208:8080';
const USERNAME = 'test@abc.com';
const PASSWORD = '1';
export function index() {
	return http.get(`${BASE_URL}`);
}

export function login() {
  let payload = JSON.stringify({
    email: USERNAME,
    password: PASSWORD,
  });

  let params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  return http.post(`${BASE_URL}/login/token`, payload, params);
};

export function getMyInfo(loginRes) {
  let authHeaders = {
    headers: {
      Authorization: `Bearer ${loginRes.json('accessToken')}`
    },
  };
  return http.get(`${BASE_URL}/members/me`, authHeaders).json();
};

export function updateMyInfo(loginRes) {
  let payload = JSON.stringify({
    email: USERNAME,
    password: PASSWORD,
    age: '20'
  });

  let params = {
    headers: {
      Authorization: `Bearer ${loginRes.json('accessToken')}`,
      'Content-Type': 'application/json'
    },
  };
  return http.put(`${BASE_URL}/members/me`, payload, params);
};

export function findPath(loginRes, source, target) {
  let params = {
    headers: {
      Authorization: `Bearer ${loginRes.json('accessToken')}`,
    }
  };

  return http.get(`${BASE_URL}/paths/?source=` + source + `&target=` + target, params).json();
};

export default function() {
    index();
    let loginRes = login();

    check(loginRes, {"logged in successfully": resp => resp.json("accessToken") !== ""});
    check(getMyInfo(loginRes), { "retrieved member": obj => obj.id != 0 });
    check(updateMyInfo(loginRes), { "updated info": (r) => r.status == 200 });
    check(findPath(loginRes, 2, 11), { "path check": obj => obj.stations.length != 0 });

    sleep(1);
}