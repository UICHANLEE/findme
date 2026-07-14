export type RoomKey = "eyes" | "sound" | "body" | "heart" | "grace";

export const rooms = [
  { key: "eyes" as const, name: "눈으로 find", short: "눈", location: "소강당", color: "#3568e8", soft: "#e8efff", prompt: "눈을 들어, 함께 발견해요", mark: "◉" },
  { key: "sound" as const, name: "소리로 find", short: "소리", location: "000호", color: "#e9542f", soft: "#fff0eb", prompt: "귀 기울일 때 들리는 것들", mark: ")))" },
  { key: "body" as const, name: "몸으로 find", short: "몸", location: "대강당", color: "#1d9a6c", soft: "#e5f7ef", prompt: "움직이며 하나가 되는 시간", mark: "↗" },
  { key: "heart" as const, name: "마음으로 find", short: "마음", location: "000호", color: "#8b54c6", soft: "#f2eafd", prompt: "마음 깊은 곳을 천천히 바라봐요", mark: "♡" },
  { key: "grace" as const, name: "은혜로 find", short: "은혜", location: "000호", color: "#d89b18", soft: "#fff5d8", prompt: "선물처럼 주어진 오늘을 기억해요", mark: "✦" },
];

export const teams = [
  { id: "eyes-1", label: "눈으로 1조", room: "eyes" as const },
  { id: "eyes-2", label: "눈으로 2조", room: "eyes" as const },
  { id: "sound-1", label: "소리로 1조", room: "sound" as const },
  { id: "body-1", label: "몸으로 1조", room: "body" as const },
  { id: "body-2", label: "몸으로 2조", room: "body" as const },
  { id: "body-3", label: "몸으로 3조", room: "body" as const },
  { id: "heart-1", label: "마음으로 1조", room: "heart" as const },
  { id: "heart-2", label: "마음으로 2조", room: "heart" as const },
  { id: "grace-1", label: "은혜로 1조", room: "grace" as const },
  { id: "grace-2", label: "은혜로 2조", room: "grace" as const },
];

export const getRoom = (key: string | null) => rooms.find((room) => room.key === key);
export const getTeam = (id: string | null) => teams.find((team) => team.id === id);

export type TeamState = {
  teamId: string;
  currentRoom: RoomKey | null;
  enteredAt: string | null;
  updatedAt: string | null;
};
