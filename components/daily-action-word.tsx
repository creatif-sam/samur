import React, { useEffect, useState } from "react";

type ActionContent = {
  word: string;
  text: string;
  reference: string;
};

const DailyActionWord: React.FC = () => {
  const [data, setData] = useState<ActionContent | null>(null);

  useEffect(() => {
    const content: ActionContent[] = [
      { word: "ACT", text: "Do not merely listen to the word and so deceive yourselves. Do what it says.", reference: "James 1:22" },
      { word: "SERVE", text: "Serve one another humbly in love.", reference: "Galatians 5:13" },
      { word: "WORK", text: "Whatever you do work at it with all your heart as working for the Lord.", reference: "Colossians 3:23" },
      { word: "GO", text: "Therefore go and make disciples of all nations.", reference: "Matthew 28:19" },
      { word: "BUILD", text: "By wisdom a house is built and through understanding it is established.", reference: "Proverbs 24:3" },
      { word: "STAND", text: "Put on the full armor of God so that you may be able to stand.", reference: "Ephesians 6:13" },
      { word: "RUN", text: "Let us run with perseverance the race marked out for us.", reference: "Hebrews 12:1" },
      { word: "GIVE", text: "It is more blessed to give than to receive.", reference: "Acts 20:35" },
      { word: "OBEY", text: "If you love me keep my commands.", reference: "John 14:15" },
      { word: "TRUST", text: "Trust in the Lord with all your heart.", reference: "Proverbs 3:5" },
      { word: "SEEK", text: "Seek first his kingdom and his righteousness.", reference: "Matthew 6:33" },
      { word: "PRAY", text: "Pray continually.", reference: "1 Thessalonians 5:17" },
      { word: "FORGIVE", text: "Forgive as the Lord forgave you.", reference: "Colossians 3:13" },
      { word: "FOLLOW", text: "Whoever wants to be my disciple must deny themselves and follow me.", reference: "Luke 9:23" },
      { word: "LOVE", text: "Let us love one another for love comes from God.", reference: "1 John 4:7" },
      { word: "ENCOURAGE", text: "Encourage one another and build each other up.", reference: "1 Thessalonians 5:11" },
      { word: "WAIT", text: "Those who wait on the Lord will renew their strength.", reference: "Isaiah 40:31" },
      { word: "RESIST", text: "Resist the devil and he will flee from you.", reference: "James 4:7" },
      { word: "REJOICE", text: "Rejoice in the Lord always.", reference: "Philippians 4:4" },
      { word: "ENDURE", text: "The one who stands firm to the end will be saved.", reference: "Matthew 24:13" },
      { word: "PURSUE", text: "Pursue peace with everyone.", reference: "Hebrews 12:14" },
      { word: "GUARD", text: "Above all else guard your heart.", reference: "Proverbs 4:23" },
      { word: "BELIEVE", text: "Everything is possible for one who believes.", reference: "Mark 9:23" },
      { word: "CARRY", text: "Carry each other’s burdens.", reference: "Galatians 6:2" },
      { word: "TEACH", text: "Train up a child in the way he should go.", reference: "Proverbs 22:6" },
      { word: "WATCH", text: "Watch and pray so that you will not fall into temptation.", reference: "Matthew 26:41" },
      { word: "SUBMIT", text: "Offer your bodies as a living sacrifice.", reference: "Romans 12:1" },
      { word: "FIGHT", text: "Fight the good fight of the faith.", reference: "1 Timothy 6:12" },
      { word: "REMEMBER", text: "Remember how the Lord your God led you.", reference: "Deuteronomy 8:2" },
      { word: "FINISH", text: "I have fought the good fight I have finished the race.", reference: "2 Timothy 4:7" },
      { word: "LEAD", text: "In their hearts humans plan their course but the Lord establishes their steps.", reference: "Proverbs 16:9" },
      { word: "HELP", text: "My help comes from the Lord.", reference: "Psalm 121:2" },
      { word: "PRACTICE", text: "Put into practice whatever you have learned.", reference: "Philippians 4:9" },
      { word: "STRENGTHEN", text: "Be strong and courageous.", reference: "Joshua 1:9" },
      { word: "SPEAK TRUTH", text: "Speaking the truth in love.", reference: "Ephesians 4:15" },
      { word: "PLANT", text: "A time to plant and a time to uproot.", reference: "Ecclesiastes 3:2" },
      { word: "PERSEVERE", text: "Let us not become weary in doing good.", reference: "Galatians 6:9" },
      { word: "STAND FIRM", text: "Stand firm then with the belt of truth.", reference: "Ephesians 6:14" },

      { word: "DO", text: "The proof of faith is action. Any faith that does not act is fake.", reference: "Bishop David Oyedepo" },
      { word: "ENGAGE", text: "Revelation delivers nothing until it is acted upon.", reference: "Bishop David Oyedepo" },
      { word: "MOVE", text: "Every destiny changes level when responsibility is taken.", reference: "Bishop David Oyedepo" },
      { word: "COMMIT", text: "Commitment is what turns vision into reality.", reference: "Bishop David Oyedepo" },
      { word: "PRACTICE", text: "Spiritual knowledge becomes profitable only when it is practiced.", reference: "Bishop David Oyedepo" },

      { word: "START", text: "The secret of your success is found in your daily routine.", reference: "John Maxwell" },
      { word: "LEARN", text: "Change is inevitable. Growth is optional.", reference: "John Maxwell" },
      { word: "DISCIPLINE", text: "Small disciplines repeated daily lead to great achievements.", reference: "John Maxwell" },
      { word: "LEAD SELF", text: "You cannot lead others until you lead yourself.", reference: "John Maxwell" },
      { word: "CONSISTENCY", text: "Success comes from knowing your purpose and growing toward it every day.", reference: "John Maxwell" }
    ];

    const randomIndex = Math.floor(Math.random() * content.length);
    setData(content[randomIndex]);
  }, []);

  if (!data) return null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #7c3aed, #000000)",
        color: "white",
        padding: "24px",
        textAlign: "center",
        borderRadius: "12px"
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>{data.word}</h1>
      <p style={{ marginTop: "16px", fontSize: "18px" }}>{data.text}</p>
      <p style={{ marginTop: "8px", fontSize: "16px", fontStyle: "italic", opacity: 0.9 }}>
        {data.reference}
      </p>
    </div>
  );
};

export default DailyActionWord;
