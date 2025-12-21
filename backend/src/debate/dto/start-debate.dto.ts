export class StartDebateDto {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: number;
  judgePrompt: string;
  api_key?: string;
}
