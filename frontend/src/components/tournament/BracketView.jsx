import { Clock, MapPin, Trophy } from "lucide-react";
import { MATCH_STATUS, fmtDateTime } from "../../utils/tournament";

function Side({ entry, sets, side, isWinner, highlight }) {
  const name = entry?.displayName;
  return (
    <div
      className={`tm-side ${isWinner ? "tm-side--win" : ""} ${highlight ? "tm-side--me" : ""}`}
    >
      <span className={`tm-side-name ${name ? "" : "tm-side-name--tbd"}`}>
        {isWinner && <Trophy size={13} aria-label="Thắng" />}
        {name || "Chờ xác định"}
      </span>
      <span className="tm-side-sets">
        {(sets || []).map((s, i) => (
          <span key={i} className={s[side] > s[side === "a" ? "b" : "a"] ? "tm-set-win" : ""}>
            {s[side]}
          </span>
        ))}
      </span>
    </div>
  );
}

export function MatchCard({ m, onSelect, highlightIds = [] }) {
  const winA = m.winner && String(m.winner._id || m.winner) === String(m.entryA?._id);
  const winB = m.winner && String(m.winner._id || m.winner) === String(m.entryB?._id);
  const Tag = onSelect && !m.isBye ? "button" : "div";
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      className={`tm-match tm-match--${m.status} ${m.isBye ? "tm-match--bye" : ""} ${Tag === "button" ? "tm-match--btn" : ""}`}
      onClick={Tag === "button" ? () => onSelect(m) : undefined}
    >
      <div className="tm-match-meta">
        <span>
          <Clock size={12} aria-hidden="true" /> {m.isBye ? "Miễn đấu" : fmtDateTime(m.scheduledAt)}
        </span>
        {m.court?.name && (
          <span>
            <MapPin size={12} aria-hidden="true" /> {m.court.name}
          </span>
        )}
        {!m.isBye && m.status !== "scheduled" && (
          <span className={`tm-mstatus tm-mstatus--${m.status}`}>{MATCH_STATUS[m.status]}</span>
        )}
      </div>
      <Side
        entry={m.entryA}
        sets={m.sets}
        side="a"
        isWinner={winA}
        highlight={highlightIds.includes(String(m.entryA?._id))}
      />
      {!m.isBye && (
        <Side
          entry={m.entryB}
          sets={m.sets}
          side="b"
          isWinner={winB}
          highlight={highlightIds.includes(String(m.entryB?._id))}
        />
      )}
      {m.note && !m.isBye && <p className="tm-match-note">{m.note}</p>}
    </Tag>
  );
}

// Sơ đồ loại trực tiếp: mỗi vòng một cột; trận thêm tay hiện riêng bên dưới
export default function BracketView({ matches, onSelect, highlightIds, emptyText }) {
  if (!matches?.length) {
    return <div className="rs-empty">{emptyText || "Chưa có lịch thi đấu."}</div>;
  }
  const bracket = matches.filter((m) => m.inBracket !== false);
  const extra = matches.filter((m) => m.inBracket === false);
  const rounds = [...new Set(bracket.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="tm-bracket-wrap">
      {rounds.length > 0 && (
        <div className="tm-bracket" role="list" aria-label="Sơ đồ thi đấu">
          {rounds.map((r) => {
            const list = bracket.filter((m) => m.round === r);
            return (
              <section key={r} className="tm-round" role="listitem">
                <h4 className="tm-round-title">{list[0]?.roundName || `Vòng ${r}`}</h4>
                <div className="tm-round-matches">
                  {list.map((m) => (
                    <MatchCard key={m._id} m={m} onSelect={onSelect} highlightIds={highlightIds} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {extra.length > 0 && (
        <section className="tm-extra">
          <h4 className="tm-round-title">Trận phụ</h4>
          <div className="tm-extra-grid">
            {extra.map((m) => (
              <div key={m._id}>
                <p className="tm-extra-name">{m.roundName}</p>
                <MatchCard m={m} onSelect={onSelect} highlightIds={highlightIds} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
