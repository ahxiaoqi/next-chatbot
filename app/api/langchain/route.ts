import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { NextRequest, NextResponse } from "next/server";


function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
// POST 处理函数
export async function POST(request: NextRequest) {
  try {
    // 解析请求体获取用户输入
    const { text,history } = await request.json();
console.log(text)
    // 验证输入
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: "请提供有效的文本进行翻译" },
        { status: 400 }
      );
    }
    history.push(["human", text]);

    const d = ["AIzaSyAaoXBTNaedX39QC0herjvLxvMF6gFiiUg", "AIzaSyBgcDHdmehT0VwI2iVK9Fasb0zja_g2jFs", 
        "AIzaSyAJgY-qvAChEuUV3gacI3iQHIwCwhKklhE", "AIzaSyATucpbOnN_lx0Bf7fXNTSXq1z_Wh3adE4",
         "AIzaSyDNMVNnCHb30Ph8_iBsUnBWJ8W7s6uM_7w","AIzaSyAsHJ1vJs80KxaIgTbu18bz8gSRiHr53Tk"];
    const apiKey = getRandomElement(d);
    const llm = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        model: "gemini-2.5-pro-exp-03-25",
        temperature: 0.7,
        maxRetries: 2,
      });
    // 调用 AI 模型进行翻译
    const aiMsg = await llm.invoke(history);

    // 返回翻译结果
    return NextResponse.json({ 
      result: aiMsg.content,
      sourceText: text
    });
    
  } catch (error: any) {
    console.error("翻译过程中出错:", error);
    return NextResponse.json(
      { error: "处理请求时出错", details: error.message },
      { status: 500 }
    );
  }
}
