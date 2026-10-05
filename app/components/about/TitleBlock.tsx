import { company } from '../../data/company';
import { leadership } from '../../data/people';

// /pro-nas «Хто стоїть за RUBIKON» — the corner stamp of the header (owner, 04.10: the right of the header was empty;
// use it «з розумом», not for the sake of adding). A drawing's title block is the convention that literally says who
// answers for the sheet, and this page's headline is «відповідаємо своїми іменами»: two rows, a zone of responsibility
// and the name behind it, signing into the one company. It stands in the header's bottom-right corner, on its rule,
// where a sheet carries its stamp.
//
// It says nothing new: zones and names are people.ts (the wording the /angary route stamp uses), the company cell is
// company.ts. It is not a document: no signatures, dates, sheet numbers, «Розробив / Перевірив» or norms. The header's
// aside is aria-hidden, since the lead and the two cards under it already say all of this. Styles: title-block.css.

/** «Сергій Іванович Леус» → «Леус С. І.», the form a title block uses */
function stampName(fullName: string) {
  const [first, patronymic, surname] = fullName.split(' ');
  return `${surname} ${first[0]}. ${patronymic[0]}.`;
}

export function TitleBlock() {
  return (
    <div className="ttb" data-motion>
      <dl className="ttb-rows">
        {leadership.map(({ name, role }) => (
          // The zone is the first part of the person's role («Будівельний напрям, організація виконання»)
          <div className="ttb-row" key={name}>
            <dt>{role.split(',')[0]}</dt>
            <dd>{stampName(name)}</dd>
          </div>
        ))}
      </dl>
      <p className="ttb-org">
        <small>Родинна компанія</small>
        <b>{company.name}</b>
      </p>
    </div>
  );
}
