import { ExternalLink } from "lucide-react";
import { TIER } from "../../utils/tournament";

export default function SponsorCard({ s }) {
  return (
    <article className={`tm-sponsor tm-sponsor--${s.tier}`}>
      <div className="tm-sponsor-head">
        {s.logoUrl ? (
          <img src={s.logoUrl} alt="" className="tm-sponsor-logo" loading="lazy" />
        ) : (
          <span className="tm-sponsor-logo tm-sponsor-logo--text" aria-hidden="true">
            {s.name.charAt(0)}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <h3 className="tm-sponsor-name">{s.name}</h3>
          <span className="tm-sponsor-tier">Nhà tài trợ {TIER[s.tier]?.toLowerCase()}</span>
        </div>
      </div>
      {s.description && <p className="tm-sponsor-desc">{s.description}</p>}
      {s.tournamentCount > 0 && <p className="rs-muted tm-sponsor-desc">Đồng hành {s.tournamentCount} giải</p>}
      {s.website && (
        <a className="rs-link tm-sponsor-link" href={s.website} target="_blank" rel="noopener noreferrer">
          Trang web <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
