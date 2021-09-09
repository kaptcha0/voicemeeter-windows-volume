// for now, we're hard coding 7 of each. This is the maximum available if the
// user has the Voicemeeter Potato edition.

let strips = [],
    buses = [];

for (let i = 0; i <= 7; i++) {
    strips.push({
        title: `Input Strip ${i}`,
        sid: `Strip_${i}`,
        init: (checked) => {},
        checked: false,
        enabled: true,
    });

    buses.push({
        title: `Output Bus ${i}`,
        sid: `Bus_${i}`,
        init: (checked) => {},
        checked: false,
        enabled: true,
    });
}

const itemBindList = (props) => {
    return {
        title: 'Bind Windows Volume To',
        enabled: true,
        items: [...strips, { Title: '' }, ...buses],
    };
};

export { itemBindList };
