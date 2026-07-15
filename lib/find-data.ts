export type RoomKey = "eyes" | "sound" | "body" | "heart" | "grace";

export const rooms = [
  {
    key: "eyes" as const, name: "눈으로 find", short: "눈", location: "소강당", color: "#3568e8", soft: "#e8efff", prompt: "눈을 들어, 함께 발견해요", mark: "◉",
    hosts: "의정, 하빈", capacity: "2팀 동시 진행", maxTeams: 2, reward: "승리 3 · 패배 1 달란트",
    supplies: ["단어 종이 11장", "꼬깔 15개"],
    steps: ["팀 대 팀으로 동시에 진행해요.", "꼬깔을 쓴 채 숨어 있는 단어를 찾아요.", "승리 3 · 패배 1 달란트"],
  },
  {
    key: "sound" as const, name: "소리로 find", short: "소리", location: "000호", color: "#e9542f", soft: "#fff0eb", prompt: "귀 기울일 때 들리는 것들", mark: ")))",
    hosts: "영빈", capacity: "1팀", maxTeams: 1, reward: "달란트 미정",
    supplies: ["배속 노래 4단계 × 5개", "빠른·느린 노래 단계별 음원"],
    steps: ["배속된 노래를 단계별로 맞혀요.", "빠른 노래와 느린 노래를 잘 들어요.", "한 팀씩 차례로 진행해요."],
  },
  {
    key: "body" as const, name: "몸으로 find", short: "몸", location: "외부", color: "#1d9a6c", soft: "#e5f7ef", prompt: "움직이며 하나가 되는 시간", mark: "↗",
    hosts: "중혁, 의찬", capacity: "3팀", maxTeams: 3, reward: "5 달란트",
    supplies: ["Full-text 제비 10장", "어디서 · 누구와 · 무엇을 제비"],
    steps: ["‘어디서 · 누구와 · 무엇을’ 제비를 뽑아요.", "최대 세 팀이 함께 참여해요.", "미션 완료 시 5 달란트"],
  },
  {
    key: "heart" as const, name: "마음으로 find", short: "마음", location: "000호", color: "#8b54c6", soft: "#f2eafd", prompt: "마음 깊은 곳을 천천히 바라봐요", mark: "♡",
    hosts: "스태프", capacity: "2팀", maxTeams: 2, reward: "달란트 미정",
    supplies: ["글자 문제 스케치북 2개", "매직", "문제 10개"],
    steps: ["각 팀 대표 두 명이 문제를 확인해요.", "나머지 팀원이 이구동성으로 정답을 맞혀요.", "성경 인물 · 지명 · 성경 문제"],
  },
  {
    key: "grace" as const, name: "은혜로 find", short: "은혜", location: "000호", color: "#d89b18", soft: "#fff5d8", prompt: "선물처럼 주어진 오늘을 기억해요", mark: "✦",
    hosts: "세영, 세한", capacity: "2팀 동시 진행", maxTeams: 2, reward: "승리 3 · 패배 1 달란트",
    supplies: ["성경 구절 10구절", "성경책 2권"],
    steps: ["1대1 릴레이로 성경 구절을 빨리 찾아요.", "성경책을 배려하며 조심히 넘겨요.", "승리 3 · 패배 1 달란트"],
  },
];

export const getRoom = (key: string | null) => rooms.find((room) => room.key === key);
export const cleanTeamName = (name: string) => name.trim().replace(/\s+/g, " ");
export const teamKey = (name: string) => cleanTeamName(name).toLocaleLowerCase("ko-KR");
export const elapsedRoomLabel = (enteredAt: string | null, now = Date.now()) => {
  if (!enteredAt) return "";
  const elapsed = Math.max(0, now - new Date(enteredAt).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  return minutes < 1 ? "방금 입장" : `입장 ${minutes}분째`;
};

export type TeamState = {
  teamId: string;
  teamName: string;
  currentRoom: RoomKey | null;
  enteredAt: string | null;
  updatedAt: string | null;
};

export type ActivityLog = {
  id: string;
  teamId: string;
  teamName: string;
  room: RoomKey;
  action: "enter" | "exit";
  timestamp: string;
  durationSeconds: number | null;
};
